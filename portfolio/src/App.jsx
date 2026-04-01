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