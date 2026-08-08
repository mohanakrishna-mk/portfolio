import React from "react";
import {
  FaReact,
  FaNodeJs,
  FaAws,
  FaDocker,
  FaGitAlt,
  FaGithub,
  FaLinkedin,
  FaEnvelope
} from "react-icons/fa";

import {
  SiNextdotjs,
  SiPostgresql,
  SiTailwindcss,
  SiJavascript,
  SiRedux,
  SiExpress,
  SiMongodb,
  SiMysql,
  SiGitlab
} from "react-icons/si";

export default function App() {


  script = "import logging
import os
import time
from contextlib import asynccontextmanager
import boto3
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
import httpx
import uvicorn

# Configure structured logging for Kubernetes / AWS CloudWatch
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("secure-gateway-service")

# Environment Configurations
BACKEND_URL = os.getenv("BACKEND_URL", "http://downstream-pod-service:8001")
SCAN_ENGINE_URL = os.getenv(
    "SCAN_ENGINE_URL", "http://scan-engine-service:8002/scan"
)
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "your-secure-upload-bucket")

raw_endpoints = os.getenv("ALLOWED_ENDPOINTS", "/api/v1/upload")
ALLOWED_ENDPOINTS = [ep.strip() for ep in raw_endpoints.split(",") if ep.strip()]

client: httpx.AsyncClient = None
s3_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
  global client, s3_client

  # Initialize boto3 S3 Client (Natively inherits EKS IRSA IAM roles)
  s3_client = boto3.client("s3")

  # Tuned for AWS API Gateway's 29-second limit (27s timeout, 5s connect timeout)
  client = httpx.AsyncClient(
      timeout=httpx.Timeout(27.0, connect=5.0),
      limits=httpx.Limits(max_keepalive_connections=100, max_connections=200),
  )
  logger.info(
      f"Gateway initialized. Target Downstream: {BACKEND_URL} | Scan Engine:"
      f" {SCAN_ENGINE_URL}"
  )
  yield
  await client.aclose()
  logger.info("Gateway client closed successfully.")


app = FastAPI(lifespan=lifespan)


# Global Exception Handler returning consistent JSON error structures
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
  return JSONResponse(
      status_code=exc.status_code,
      content={
          "success": False,
          "error_code": exc.status_code,
          "message": exc.detail,
          "path": request.url.path,
      },
  )


# Kubernetes Health Check Probe Endpoint
@app.get("/health")
async def health_check():
  return {"status": "healthy"}


@app.post("/{path:path}")
async def gateway_post_service(
    request: Request,
    path: str,
    file: UploadFile = File(...),
    message: str | None = Form(None),
):
  start_time = time.time()
  full_path = f"/{path}"

  # 1. Enforce Strict Whitelist from Environment Variable
  if full_path not in ALLOWED_ENDPOINTS:
    logger.warning(
        f"Blocked unauthorized POST access attempt to path: {full_path}"
    )
    raise HTTPException(
        status_code=404, detail="Endpoint not found or not allowed."
    )

  # Extract additional form fields if present alongside the file and message
  try:
    form = await request.form()
  except Exception:
    form = {}

  form_fields = {}
  for key, value in form.multi_items():
    if key == "file":
      continue
    if isinstance(value, UploadFile):
      continue
    form_fields[key] = value

  if message is not None and "message" not in form_fields:
    form_fields["message"] = message

  logger.info(
      f"Upload processing started | Path: {full_path} | Filename:"
      f" {file.filename} | Content-Type: {file.content_type}"
  )

  file_key = f"quarantine/{int(time.time())}_{file.filename}"

  # 2. Upload file object directly to S3 Bucket via Threadpool (Non-blocking async execution)
  try:
    await run_in_threadpool(
        s3_client.upload_fileobj,
        file.file,
        S3_BUCKET_NAME,
        file_key,
        ExtraArgs={
            "ContentType": file.content_type or "application/octet-stream"
        },
    )
    logger.info(
        f"File successfully stored in S3 quarantine: s3://{S3_BUCKET_NAME}/{file_key}"
    )
  except Exception as e:
    logger.error(f"S3 upload failure for {file.filename}: {str(e)}")
    raise HTTPException(
        status_code=500, detail="Failed to persist file to storage bucket."
    )

  # Reset pointer position for the scan engine payload read
  file.file.seek(0)

  # 3. Send file and form fields to Scan Engine as a proper multipart request
  scan_files = {
      "file": (
          file.filename,
          file.file,
          file.content_type,
      )
  }

  try:
    logger.info(f"Sending file to scan engine | Filename: {file.filename}")
    scan_response = await client.post(
        SCAN_ENGINE_URL, files=scan_files, data=form_fields
    )
  except httpx.TimeoutException:
    logger.error(f"Scan engine timeout for {file.filename}")
    raise HTTPException(
        status_code=504,
        detail="Gateway Timeout: Security scan service took too long to respond.",
    )
  except httpx.RequestError as e:
    logger.error(f"Scan engine network error for {file.filename}: {str(e)}")
    raise HTTPException(
        status_code=503,
        detail=(
            "Service Unavailable: Failed to connect to security scan service."
        ),
    )

  if scan_response.status_code != 200:
    logger.error(
        f"Scan engine returned non-200 status code: {scan_response.status_code}"
    )
    raise HTTPException(
        status_code=503,
        detail="Service Unavailable: Security scan engine failure.",
    )

  # Parse and validate JSON response from Scan Engine
  try:
    scan_result = scan_response.json()
  except Exception:
    logger.error(f"Scan engine returned malformed JSON for {file.filename}")
    raise HTTPException(
        status_code=502,
        detail="Bad Gateway: Malformed response from security scan engine.",
    )

  if not isinstance(scan_result, dict):
    logger.error(f"Scan engine JSON is not a dictionary: {scan_result}")
    raise HTTPException(
        status_code=502,
        detail="Bad Gateway: Invalid security scan schema response.",
    )

  scan_status = scan_result.get("scanStatus")
  file_status = scan_result.get("fileStatus")

  # 4. Enforce Real AV Decision Logic
  is_safe = (scan_status == "SCAN_SUCCESS") and (file_status == "CLEAN")

  logger.info(
      f"Scan completed | Filename: {file.filename} | scanStatus:"
      f" {scan_status} | fileStatus: {file_status} | is_safe: {is_safe}"
  )

  if not is_safe:
    reason = scan_result.get(
        "reason", "Malware detected or scan status unsuccessful."
    )
    logger.warning(
        f"Security Event: Malware detected or scan failed | Filename:"
        f" {file.filename} | Reason: {reason} | Action: Retaining file in S3"
        f" quarantine ({file_key}) and aborting downstream call."
    )
    # KEEP file in S3 quarantine. DO NOT delete S3 object. DO NOT call downstream.
    raise HTTPException(
        status_code=400,
        detail=(
            "File security check failed: Potential vulnerability or malware"
            " detected."
        ),
    )

  # 5. If safe, reset pointer and construct NEW multipart request for downstream
  file.file.seek(0)

  downstream_files = {
      "file": (
          file.filename,
          file.file,
          file.content_type,
      )
  }

  headers = dict(request.headers)
  headers.pop("host", None)
  headers.pop("content-length", None)
  headers.pop(
      "content-type", None
  )  # Let httpx generate fresh multipart boundaries

  try:
    downstream_url = f"{BACKEND_URL}{full_path}"
    logger.info(
        f"Forwarding safe file to downstream | Path: {full_path} | Filename:"
        f" {file.filename}"
    )
    response = await client.request(
        method="POST",
        url=downstream_url,
        headers=headers,
        params=request.query_params,
        files=downstream_files,
        data=form_fields,
    )
  except httpx.TimeoutException:
    logger.error(f"Downstream pod timeout for {full_path}")
    raise HTTPException(
        status_code=504,
        detail="Gateway Timeout: Downstream pod took too long to respond.",
    )
  except httpx.RequestError as e:
    logger.error(f"Downstream network error for {full_path}: {str(e)}")
    raise HTTPException(
        status_code=502,
        detail="Bad Gateway: Failed to communicate with downstream pod.",
    )

  # 6. Log Metrics and Return Successful Response
  duration = time.time() - start_time
  logger.info(
      f"Proxied [POST] {full_path} -> Status: {response.status_code} | Filename:"
      f" {file.filename} | Duration: {duration:.4f}s"
  )

  return Response(
      content=response.content,
      status_code=response.status_code,
      headers=dict(response.headers),
  )


if __name__ == "__main__":
  host = os.getenv("HOST", "0.0.0.0")
  port = int(os.getenv("PORT", 8000))
  uvicorn.run("main:app", host=host, port=port, reload=False)"

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">


      {/* HEADER */}

      <header className="bg-white border-b sticky top-0 z-50">

        <nav className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex justify-between items-center">

          <h1 className="text-2xl font-bold text-blue-600">
            Mohana Krishna T
          </h1>

          <div className="flex gap-6 text-xl">

            <a href="https://github.com/mohanakrishna-mk">
              <FaGithub/>
            </a>

            <a href="https://linkedin.com/in/mohanakrishna-mk">
              <FaLinkedin/>
            </a>

            <a href="mailto:mohanakrishna.mk2@gmail.com">
              <FaEnvelope/>
            </a>

          </div>

        </nav>

      </header>



      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-16">


        {/* HERO */}

        <section className="grid lg:grid-cols-2 gap-16 items-center mb-24">

          <div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
              Full Stack Developer
            </h2>

            <p className="text-lg sm:text-xl text-gray-600 mb-8">
              4+ years building enterprise applications at <strong>TCS</strong>.
              Focused on scalable systems using React, Node.js, Next.js and AWS.
            </p>

            <div className="flex flex-wrap gap-4">

              <a
                href="/Mohana_Krishna_4.2yrs.pdf"
                className="bg-blue-600 text-white px-7 py-3 rounded-lg hover:bg-blue-700"
              >
                Download Resume
              </a>

              <a
                href="https://github.com/mohanakrishna-mk"
                className="border px-7 py-3 rounded-lg hover:bg-gray-100"
              >
                GitHub
              </a>

              <a
                href="https://linkedin.com/in/mohanakrishna-mk"
                className="border px-7 py-3 rounded-lg hover:bg-gray-100"
              >
                LinkedIn
              </a>

            </div>

          </div>



          {/* IMAGE */}

          {/* <div className="flex justify-center">

            <img
              src="/profile.jpg"
              alt="profile"
              className="w-72 sm:w-80 lg:w-96 rounded-2xl shadow-xl object-cover"
            />

          </div> */}

        </section>



        {/* SKILLS */}

        <section className="mb-24">

          <h3 className="text-3xl font-bold mb-10 border-l-4 border-blue-600 pl-4">
            Technical Toolbox
          </h3>


          <SkillSection
            title="Frontend"
            skills={[
              {icon:<FaReact color="#61DAFB"/>,name:"React"},
              {icon:<SiNextdotjs/>,name:"Next.js"},
              {icon:<SiJavascript color="#F7DF1E"/>,name:"JavaScript"},
              {icon:<SiTailwindcss color="#06B6D4"/>,name:"Tailwind"},
              {icon:<SiRedux color="#764ABC"/>,name:"Redux"}
            ]}
          />

          <SkillSection
            title="Backend"
            skills={[
              {icon:<FaNodeJs color="#339933"/>,name:"Node.js"},
              {icon:<SiExpress/>,name:"Express"},
              {icon:<span className="font-bold text-xl">Z</span>,name:"Zod"}
            ]}
          />

          <SkillSection
            title="Databases"
            skills={[
              {icon:<SiMongodb color="#47A248"/>,name:"MongoDB"},
              {icon:<SiPostgresql color="#336791"/>,name:"PostgreSQL"},
              {icon:<SiMysql color="#4479A1"/>,name:"MySQL"}
            ]}
          />

          <SkillSection
            title="Cloud & DevOps"
            skills={[
              {icon:<FaAws color="#FF9900"/>,name:"AWS"},
              {icon:<FaDocker color="#2496ED"/>,name:"Docker"},
              {icon:<FaGitAlt color="#F05032"/>,name:"Git"},
              {icon:<SiGitlab color="#FC6D26"/>,name:"GitLab CI/CD"}
            ]}
          />

        </section>

        {/* PROJECTS */}

        <section className="mb-24">

          <h3 className="text-3xl font-bold mb-10 border-l-4 border-blue-600 pl-4">
            Projects Timeline
          </h3>

          <div className="relative border-l border-gray-300 ml-4 space-y-12">

            <TimelineProject
              title="Serverless Notification Engine — FinTech Platform"
              date="Oct 2024 – Present"
              description="Multi-channel notification platform supporting email, SMS and in-app alerts. Built scalable event-driven workflows using AWS services."
              impact="Processes ~50K notification events per day with retry queues and delivery analytics."
              tags={[
                "React 18",
                "Redux Toolkit",
                "TypeScript",
                "Node.js",
                "AWS Lambda",
                "SQS",
                "SNS",
                "SES",
                "EventBridge",
                "DynamoDB"
              ]}
            />

            <TimelineProject
              title="Insurance Claims Processing Platform"
              date="Aug 2023 – Sep 2024"
              description="Enterprise claims management system enabling agents to submit, review and approve insurance claims with real-time workflow updates."
              impact="Reduced claim detail load time from 4.2s to under 900ms through Redis caching and PostgreSQL query optimization."
              tags={[
                "React",
                "Redux",
                "TypeScript",
                "Node.js",
                "Express",
                "PostgreSQL",
                "Redis",
                "Socket.IO",
                "AWS EC2",
                "Docker"
              ]}
            />

            <TimelineProject
              title="Digital Customer Onboarding Platform"
              date="Feb 2022 – Jul 2023"
              description="Customer onboarding system with multi-step application workflow, document uploads and reviewer approval dashboard."
              impact="Reduced onboarding abandonment rate from 30% to 8% using optimized Next.js workflows."
              tags={[
                "Redhux",
                "React",
                "TypeScript",
                "Node.js",
                "Express",
                "PostgreSQL",
                "MySQL",
                "AWS ECS Fargate",
                "S3",
                "SQS"
              ]}
            />

          </div>

        </section>



        {/* FOOTER */}

        <footer className="text-center text-gray-500 border-t pt-10 pb-6">
          © 2026 Mohana Krishna
        </footer>


      </main>

    </div>
  );
}



/* SKILL SECTION */

function SkillSection({title,skills}){

  return(

    <div className="mb-12">

      <h4 className="font-semibold mb-5 text-lg text-gray-700">
        {title}
      </h4>

      <div className="overflow-x-auto">

        <div className="flex gap-6 min-w-max">

          {skills.map((skill,index)=>(

            <SkillCard
              key={index}
              icon={skill.icon}
              name={skill.name}
            />

          ))}

        </div>

      </div>

    </div>

  )

}



/* SKILL CARD */

function SkillCard({icon,name}){

  return(

    <div className="bg-white px-6 py-6 rounded-xl shadow hover:shadow-lg transition flex flex-col items-center gap-3 min-w-[130px]">

      <div className="text-4xl">
        {icon}
      </div>

      <span className="text-sm font-semibold">
        {name}
      </span>

    </div>

  )

}



/* TIMELINE */

function TimelineProject({title,date,description,impact,tags}){

  return(

    <div className="ml-6 relative">

      <div className="absolute -left-9 top-2 w-4 h-4 bg-blue-600 rounded-full"></div>

      <p className="text-sm text-gray-500 mb-1">
        {date}
      </p>

      <h4 className="text-xl font-bold mb-2">
        {title}
      </h4>

      <p className="text-gray-600 mb-3">
        {description}
      </p>

      <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-4">

        <p className="text-sm text-green-800">
          <strong>Outcome:</strong> {impact}
        </p>

      </div>
      <p > {script}      
      </p>

      <div className="flex flex-wrap gap-2">

        {tags.map(tag=>(

          <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
            {tag}
          </span>

        ))}

      </div>

    </div>

  )

}
