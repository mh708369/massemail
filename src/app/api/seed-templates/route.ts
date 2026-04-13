import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Brand logos via Google Favicon API — returns PNG, works in ALL email clients
// sz=128 gives the highest quality available; we display at 40-48px via CSS
const G = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const LOGO = {
  aws: G("aws.amazon.com"),
  azure: G("azure.microsoft.com"),
  gcp: G("cloud.google.com"),
  microsoft: G("microsoft.com"),
  google: G("google.com"),
  cisco: G("cisco.com"),
  comptia: G("comptia.org"),
  oracle: G("oracle.com"),
  redhat: G("redhat.com"),
  sap: G("sap.com"),
  docker: G("docker.com"),
  kubernetes: G("kubernetes.io"),
  terraform: G("hashicorp.com"),
  ansible: G("ansible.com"),
  jenkins: G("jenkins.io"),
  python: G("python.org"),
  tensorflow: G("tensorflow.org"),
  pytorch: G("pytorch.org"),
  openai: G("openai.com"),
  scrum: G("scrumalliance.org"),
  kafka: G("kafka.apache.org"),
  spark: G("spark.apache.org"),
  prometheus: G("prometheus.io"),
  grafana: G("grafana.com"),
  elasticsearch: G("elastic.co"),
  linux: G("linux.org"),
  kali: G("kali.org"),
};

const LOGO_STYLE = `width:40px;height:40px;display:inline-block;margin:4px 6px;vertical-align:middle;`;
const LOGO_STYLE_SM = `width:30px;height:30px;display:inline-block;margin:3px 5px;vertical-align:middle;`;

const SIGNATURE = `<p style="margin-top:24px;padding-top:16px;border-top:1px solid #ddd;">
  <strong>Synergific Cloud Team</strong><br>
  Synergific Software Pvt. Ltd.<br>
  <span style="font-size:13px;">
  <a href="mailto:cloud@synergificsoftware.com" style="color:#0066cc;">cloud@synergificsoftware.com</a><br>
  +91 8884 907 660 | +91 9035 406 484<br>
  <a href="https://synergificsoftware.com" style="color:#0066cc;">synergificsoftware.com</a> | <a href="https://store.synergificsoftware.com" style="color:#0066cc;">store.synergificsoftware.com</a>
  </span><br>
  <span style="font-size:11px;color:#999;">ISO 9001:2015 & ISO 10004:2018 Certified | 500+ Enterprise Clients</span>
</p>`;

const CLOUD_LOGOS = `<div style="text-align:center;margin:16px 0;">
  <p style="margin:0 0 8px 0;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Cloud Partners</p>
  <img src="${LOGO.aws}" alt="AWS" style="${LOGO_STYLE}" />
  <img src="${LOGO.azure}" alt="Microsoft Azure" style="${LOGO_STYLE}" />
  <img src="${LOGO.gcp}" alt="Google Cloud" style="${LOGO_STYLE}" />
</div>`;

const ALL_PARTNER_LOGOS = `<div style="text-align:center;margin:16px 0;">
  <p style="margin:0 0 8px 0;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Authorized Training Partners — 50+ OEMs</p>
  <img src="${LOGO.aws}" alt="AWS" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.azure}" alt="Azure" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.gcp}" alt="GCP" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.microsoft}" alt="Microsoft" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.cisco}" alt="Cisco" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.oracle}" alt="Oracle" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.redhat}" alt="Red Hat" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.sap}" alt="SAP" style="${LOGO_STYLE_SM}" />
</div>`;

const DEVOPS_LOGOS = `<div style="text-align:center;margin:16px 0;">
  <p style="margin:0 0 8px 0;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">DevOps Toolchain We Teach</p>
  <img src="${LOGO.docker}" alt="Docker" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.kubernetes}" alt="Kubernetes" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.terraform}" alt="Terraform" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.ansible}" alt="Ansible" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.jenkins}" alt="Jenkins" style="${LOGO_STYLE_SM}" />
</div>`;

const AI_LOGOS = `<div style="text-align:center;margin:16px 0;">
  <p style="margin:0 0 8px 0;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">AI/ML Tech Stack</p>
  <img src="${LOGO.python}" alt="Python" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.tensorflow}" alt="TensorFlow" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.pytorch}" alt="PyTorch" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.openai}" alt="OpenAI" style="${LOGO_STYLE_SM}" />
</div>`;

const HEADER = `<p style="color:#0066cc;font-size:13px;margin:0 0 20px 0;font-style:italic;">Synergific Software — We Make IT Happen</p>`;

const TEMPLATES = [
  // ─── IT SERVICES ─────────────────────────────────────
  {
    name: "IT Services Introduction",
    type: "email",
    category: "IT Services",
    subject: "Transform Your Business with Synergific Software's IT Solutions",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>I hope this message finds you well at <strong>{{company}}</strong>.</p>

<p>I'm reaching out from <strong>Synergific Software Pvt. Ltd.</strong> — an ISO 9001:2015 & ISO 10004:2018 certified technology partner serving 500+ enterprise clients globally. Our tagline says it all: <em>"We make IT happen."</em></p>

${ALL_PARTNER_LOGOS}

<h3 style="color:#0066cc;">How we can help {{company}}:</h3>
<ul>
  <li><strong>Cloud Solutions</strong> — AWS, Microsoft Azure, Google Cloud architecture, migration & managed services</li>
  <li><strong>DevOps & Automation</strong> — Docker, Kubernetes, Terraform, CI/CD pipelines</li>
  <li><strong>AI/ML & Data Engineering</strong> — Generative AI, predictive analytics, data warehouses</li>
  <li><strong>Cybersecurity</strong> — Risk assessment, compliance, infrastructure hardening</li>
  <li><strong>Custom Software Development</strong> — Web, mobile, enterprise applications</li>
</ul>

<p>We provide <strong>24/7 global support</strong> with dedicated account managers, pre-configured CloudLabs, and enterprise pricing on industry certifications.</p>

<p>I'd love to schedule a 15-minute call to understand your priorities and explore how we can support your team. Are you available this week?</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "Cloud Migration Pitch (AWS/Azure/GCP)",
    type: "email",
    category: "IT Services",
    subject: "Cut Cloud Costs by 30% — Synergific Cloud Migration Services",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>Is <strong>{{company}}</strong> looking to migrate to the cloud or optimize existing cloud infrastructure?</p>

${CLOUD_LOGOS}

<p>At <strong>Synergific Software</strong>, we've helped 500+ enterprises migrate seamlessly to AWS, Microsoft Azure, and Google Cloud — with an average <strong>30% reduction in cloud spend</strong> in the first quarter post-migration.</p>

<h3 style="color:#0066cc;">Our Cloud Services Include:</h3>
<ul>
  <li>✅ Cloud Strategy & Architecture Design</li>
  <li>✅ Lift-and-Shift & Re-platforming</li>
  <li>✅ Cost Optimization & FinOps</li>
  <li>✅ Multi-cloud / Hybrid Cloud Setup</li>
  <li>✅ 24/7 Managed Cloud Operations</li>
  <li>✅ Pre-configured CloudLabs & Sandboxes</li>
</ul>

<p>As an ISO certified partner working with AWS, Microsoft, Google, Cisco, Oracle, Red Hat, and SAP — we bring deep expertise across the entire cloud ecosystem.</p>

<p>Would you be open to a quick discovery call to discuss your cloud roadmap?</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "DevOps Services Outreach",
    type: "email",
    category: "IT Services",
    subject: "Accelerate Delivery with DevOps — Synergific Software",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>How fast can <strong>{{company}}</strong> currently ship code to production? If your answer involves manual deployments or weekly release windows, we should talk.</p>

${DEVOPS_LOGOS}

<p><strong>Synergific Software</strong> helps engineering teams adopt modern DevOps practices that reduce deployment time from <strong>days to minutes</strong>.</p>

<h3 style="color:#0066cc;">What we offer:</h3>
<ul>
  <li>🐳 <strong>Containerization</strong> — Docker, Kubernetes orchestration</li>
  <li>⚙️ <strong>Infrastructure as Code</strong> — Terraform, Ansible, CloudFormation</li>
  <li>🔄 <strong>CI/CD Pipelines</strong> — Jenkins, GitLab CI, GitHub Actions, Azure DevOps</li>
  <li>📊 <strong>Monitoring & Observability</strong> — Prometheus, Grafana, ELK Stack</li>
  <li>🛡️ <strong>DevSecOps</strong> — Security baked into every pipeline</li>
</ul>

<p>We've built and certified DevOps practices for 500+ enterprises with hands-on CloudLabs and 20+ DevOps courses to upskill your team.</p>

<p>Interested in a free DevOps maturity assessment for {{company}}?</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "AI/ML Services Pitch",
    type: "email",
    category: "IT Services",
    subject: "Unlock AI for {{company}} — Generative AI & ML Services",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>Generative AI is rapidly transforming how businesses operate. Has <strong>{{company}}</strong> started exploring how AI/ML can drive efficiency and revenue?</p>

${AI_LOGOS}

<p>At <strong>Synergific Software</strong>, our AI/ML practice helps enterprises:</p>

<ul>
  <li>🤖 Build custom <strong>Generative AI</strong> solutions (chatbots, content generation, automation)</li>
  <li>📈 Deploy <strong>predictive analytics</strong> for forecasting and decision support</li>
  <li>👁️ Implement <strong>computer vision</strong> for quality control and automation</li>
  <li>💬 Create <strong>NLP solutions</strong> for document processing and customer support</li>
  <li>☁️ Operationalize ML on <strong>AWS SageMaker, Azure ML, Vertex AI</strong></li>
</ul>

<p>We offer 15+ AI/ML training courses and have helped 500+ enterprises build AI capabilities — from POC to production.</p>

<p>Could we set up a 20-minute call to discuss specific AI use cases for {{company}}?</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "Cybersecurity Services Outreach",
    type: "email",
    category: "IT Services",
    subject: "Is {{company}} Cyber-Ready? Synergific Security Services",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>With cyber threats growing exponentially, ensuring <strong>{{company}}</strong> has a robust security posture is critical.</p>

<p><strong>Synergific Software</strong> offers end-to-end cybersecurity services backed by certified experts and ISO 9001:2015 standards.</p>

<div style="text-align:center;margin:16px 0;">
  <p style="margin:0 0 8px 0;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Security Partners</p>
  <img src="${LOGO.cisco}" alt="Cisco" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.microsoft}" alt="Microsoft" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.aws}" alt="AWS" style="${LOGO_STYLE_SM}" />
  <img src="${LOGO.redhat}" alt="Red Hat" style="${LOGO_STYLE_SM}" />
</div>

<h3 style="color:#0066cc;">Our Cybersecurity Services:</h3>
<ul>
  <li>🛡️ <strong>Security Assessment & Penetration Testing</strong></li>
  <li>🔐 <strong>Identity & Access Management</strong> (IAM)</li>
  <li>📋 <strong>Compliance & Audit</strong> — ISO 27001, SOC 2, GDPR, HIPAA</li>
  <li>☁️ <strong>Cloud Security</strong> — AWS, Azure, GCP hardening</li>
  <li>🚨 <strong>SIEM & Incident Response</strong></li>
  <li>👥 <strong>Security Awareness Training</strong> for your workforce</li>
</ul>

<p>We're an authorized partner for CompTIA, Cisco, EC-Council and offer 24/7 security operations support.</p>

<p>I'd be happy to share a complimentary security maturity report tailored for {{company}}. Interested?</p>

${SIGNATURE}
</div>`,
  },

  // ─── TRAINING / COURSES ──────────────────────────────
  {
    name: "Corporate Training Introduction",
    type: "email",
    category: "Training",
    subject: "Upskill {{company}}'s Team — 200+ Courses from Synergific",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>Is your team at <strong>{{company}}</strong> ready for the next wave of cloud, AI, and DevOps transformation?</p>

<p><strong>Synergific Software</strong> is one of India's leading enterprise training providers, offering <strong>200+ courses</strong> across cloud, DevOps, AI/ML, cybersecurity, and emerging technologies.</p>

${ALL_PARTNER_LOGOS}

<h3 style="color:#0066cc;">Why Top Enterprises Choose Us:</h3>
<ul>
  <li>✅ <strong>500+ enterprise clients</strong> trained globally</li>
  <li>✅ <strong>50+ OEM partnerships</strong> — AWS, Microsoft, Google, Cisco, CompTIA, Oracle, Red Hat, SAP</li>
  <li>✅ <strong>1,100+ certification vouchers</strong> at enterprise pricing</li>
  <li>✅ <strong>Hands-on CloudLabs</strong> for real-world practice</li>
  <li>✅ <strong>Multiple delivery formats</strong> — Live online (VILT), in-person, self-paced</li>
  <li>✅ <strong>ISO 9001:2015 & ISO 10004:2018 certified</strong></li>
</ul>

<h3 style="color:#0066cc;">Popular Training Tracks:</h3>
<ul>
  <li>☁️ <strong>Cloud:</strong> AWS (15+ courses), Azure (13+), GCP (8+)</li>
  <li>🤖 <strong>AI/ML & Data Science:</strong> 15+ courses including GenAI, ML, NLP</li>
  <li>⚙️ <strong>DevOps:</strong> 20+ courses on Docker, Kubernetes, Terraform</li>
  <li>📊 <strong>Big Data & Analytics:</strong> 14+ courses on Power BI, Tableau, Spark</li>
  <li>🚀 <strong>Agile & Scrum:</strong> 11+ courses (PSM, CSM, SAFe, PSPO)</li>
</ul>

<p>I'd love to share our complete catalog and discuss a custom training program for {{company}}. Are you free for a quick call this week?</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "AWS Certification Bootcamp",
    type: "email",
    category: "Training",
    subject: "AWS Certification Bootcamp — Save 30% for {{company}}",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<div style="text-align:center;margin:16px 0;">
  <img src="${LOGO.aws}" alt="AWS" style="width:120px;height:auto;" />
</div>

<p>Looking to certify your team on AWS? <strong>Synergific Software</strong> offers comprehensive AWS bootcamps that have helped thousands of professionals get certified.</p>

<h3 style="color:#FF9900;">AWS Courses We Offer (15+):</h3>
<ul>
  <li>🎯 <strong>AWS Cloud Practitioner</strong> (Foundation)</li>
  <li>👨‍💻 <strong>AWS Solutions Architect</strong> — Associate & Professional</li>
  <li>⚙️ <strong>AWS DevOps Engineer</strong> — Professional</li>
  <li>🔐 <strong>AWS Security Specialty</strong></li>
  <li>📊 <strong>AWS Data Engineer & Analytics Specialty</strong></li>
  <li>🤖 <strong>AWS Machine Learning Specialty</strong></li>
  <li>👨‍💼 <strong>AWS SysOps Administrator</strong></li>
</ul>

<h3 style="color:#FF9900;">What's Included:</h3>
<ul>
  <li>✅ Live instructor-led training by AWS-certified experts</li>
  <li>✅ Hands-on AWS CloudLabs with real environments</li>
  <li>✅ AWS certification exam vouchers at <strong>up to 30% discount</strong></li>
  <li>✅ Practice tests & exam prep materials</li>
  <li>✅ Post-training support & doubt clearance</li>
</ul>

<p>For corporate batches at {{company}}, we offer customized schedules and bulk pricing. Want a quote for your team size?</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "Azure Certification Track",
    type: "email",
    category: "Training",
    subject: "Microsoft Azure Certification Programs for {{company}}",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<div style="text-align:center;margin:16px 0;">
  <img src="${LOGO.azure}" alt="Microsoft Azure" style="width:120px;height:auto;" />
</div>

<p>Microsoft Azure skills are in high demand. <strong>Synergific Software</strong> is an authorized Microsoft training partner offering all major Azure certification tracks.</p>

<h3 style="color:#0078D4;">Our Azure Courses (13+):</h3>
<ul>
  <li>🔹 <strong>AZ-900</strong> — Azure Fundamentals</li>
  <li>🔹 <strong>AZ-104</strong> — Azure Administrator</li>
  <li>🔹 <strong>AZ-204</strong> — Azure Developer</li>
  <li>🔹 <strong>AZ-305</strong> — Azure Solutions Architect</li>
  <li>🔹 <strong>AZ-400</strong> — Azure DevOps Engineer</li>
  <li>🔹 <strong>AZ-500</strong> — Azure Security Engineer</li>
  <li>🔹 <strong>AZ-700</strong> — Azure Network Engineer</li>
  <li>🔹 <strong>AI-102, DP-203, DP-900</strong> — Data & AI specialties</li>
</ul>

<h3 style="color:#0078D4;">Why Choose Synergific for Azure:</h3>
<ul>
  <li>✅ Live VILT sessions with Microsoft Certified Trainers</li>
  <li>✅ Hands-on Azure CloudLabs</li>
  <li>✅ Microsoft exam vouchers at preferred pricing</li>
  <li>✅ Custom corporate batches for {{company}}</li>
  <li>✅ Free retake guarantee on select courses</li>
</ul>

<p>Want a custom Azure learning roadmap for your team? Let's connect!</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "DevOps Bootcamp",
    type: "email",
    category: "Training",
    subject: "DevOps Bootcamp — Docker, Kubernetes, Terraform & More",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

${DEVOPS_LOGOS}

<p>DevOps is no longer optional. <strong>Synergific Software</strong> offers <strong>20+ DevOps courses</strong> covering the entire toolchain modern engineering teams need.</p>

<h3 style="color:#0066cc;">Our DevOps Curriculum:</h3>
<ul>
  <li>🐳 <strong>Containers:</strong> Docker, Docker Compose, Container Security</li>
  <li>☸️ <strong>Orchestration:</strong> Kubernetes (CKA, CKAD, CKS), OpenShift, Helm</li>
  <li>🏗️ <strong>Infrastructure as Code:</strong> Terraform Associate, Ansible</li>
  <li>🔄 <strong>CI/CD:</strong> Jenkins, GitLab CI, GitHub Actions, Azure DevOps</li>
  <li>📈 <strong>Monitoring:</strong> Prometheus, Grafana, ELK Stack</li>
  <li>🛡️ <strong>DevSecOps:</strong> Security in pipelines</li>
  <li>☁️ <strong>Cloud DevOps:</strong> AWS, Azure, GCP DevOps services</li>
</ul>

<h3 style="color:#0066cc;">Format Options:</h3>
<ul>
  <li>📅 Public scheduled batches (live online)</li>
  <li>🏢 Custom corporate programs for {{company}}</li>
  <li>👨‍🎓 Hire-Train-Deploy programs (talent + training + placement)</li>
  <li>🎓 Fresh hire onboarding bootcamps</li>
</ul>

<p>I'd love to discuss a tailored DevOps program for your team at {{company}}.</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "AI/ML & Generative AI Course",
    type: "email",
    category: "Training",
    subject: "Generative AI Bootcamp — Future-Proof Your Team at {{company}}",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>Generative AI is reshaping every industry. Is your team at <strong>{{company}}</strong> ready?</p>

${AI_LOGOS}

<p><strong>Synergific Software</strong> offers <strong>15+ AI/ML courses</strong> designed by industry practitioners — from foundational ML to cutting-edge GenAI.</p>

<h3 style="color:#0066cc;">AI/ML Courses Available:</h3>
<ul>
  <li>🤖 <strong>Generative AI Bootcamp</strong> — LLMs, Prompt Engineering, RAG, LangChain</li>
  <li>🧠 <strong>Machine Learning Foundations</strong> — Supervised/Unsupervised Learning</li>
  <li>📊 <strong>Deep Learning</strong> — TensorFlow, PyTorch, Neural Networks</li>
  <li>💬 <strong>Natural Language Processing</strong> — Transformers, BERT, GPT</li>
  <li>👁️ <strong>Computer Vision</strong> — OpenCV, YOLO, Image Recognition</li>
  <li>📈 <strong>Data Science with Python</strong></li>
  <li>☁️ <strong>MLOps</strong> — Production ML systems</li>
  <li>🎯 <strong>AWS/Azure ML certifications</strong></li>
</ul>

<h3 style="color:#0066cc;">Hands-On Learning:</h3>
<ul>
  <li>✅ Real-world capstone projects</li>
  <li>✅ GPU-enabled CloudLabs</li>
  <li>✅ Industry mentorship</li>
  <li>✅ Certification preparation</li>
</ul>

<p>Limited seats available for the next cohort. Want to enroll {{company}}'s team or get more details?</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "Hire-Train-Deploy Program",
    type: "email",
    category: "Training",
    subject: "Solve Your Tech Hiring Challenge — Hire-Train-Deploy by Synergific",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>Struggling to find ready-to-deploy tech talent at <strong>{{company}}</strong>? Our <strong>Hire-Train-Deploy (HTD)</strong> program is the answer.</p>

${ALL_PARTNER_LOGOS}

<h3 style="color:#0066cc;">How HTD Works:</h3>
<ol>
  <li>🎯 <strong>Hire</strong> — We source and screen candidates based on your specific job requirements</li>
  <li>🎓 <strong>Train</strong> — Custom 6-12 week intensive training on YOUR tech stack</li>
  <li>🚀 <strong>Deploy</strong> — Job-ready candidates start contributing from day one</li>
</ol>

<h3 style="color:#0066cc;">Tech Stacks We Train On:</h3>
<ul>
  <li>☁️ Cloud (AWS, Azure, GCP)</li>
  <li>⚙️ DevOps & SRE</li>
  <li>🤖 Data Engineering & AI/ML</li>
  <li>💻 Full-Stack Development (Java, .NET, Python, Node.js, React)</li>
  <li>📊 Data Analytics (Power BI, Tableau, Spark)</li>
  <li>🛡️ Cybersecurity</li>
</ul>

<h3 style="color:#0066cc;">Why HTD Beats Traditional Hiring:</h3>
<ul>
  <li>⚡ <strong>Fast time-to-productivity</strong> — Trained on your stack before joining</li>
  <li>💰 <strong>Cost-effective</strong> — Lower than agency placement fees</li>
  <li>🎯 <strong>Reduced attrition</strong> — Pre-screened cultural fit</li>
  <li>📋 <strong>Customized curriculum</strong> for your specific needs</li>
</ul>

<p>Would you like to schedule a 30-minute call to discuss {{company}}'s talent needs?</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "Certification Vouchers (Bulk Discount)",
    type: "email",
    category: "Training",
    subject: "1,100+ Certification Vouchers at Enterprise Pricing",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>Need certification vouchers in bulk? <strong>Synergific Software</strong> is an authorized reseller for <strong>50+ OEM vendors</strong>, offering <strong>1,100+ vouchers</strong> at the best enterprise pricing.</p>

${ALL_PARTNER_LOGOS}

<h3 style="color:#0066cc;">Certifications Available:</h3>
<ul>
  <li>☁️ <strong>AWS</strong> — All Associate, Professional, Specialty exams</li>
  <li>🔷 <strong>Microsoft</strong> — Azure, Microsoft 365, Power Platform, Dynamics</li>
  <li>🟢 <strong>Google Cloud</strong> — Associate, Professional certifications</li>
  <li>🟦 <strong>Cisco</strong> — CCNA, CCNP, CCIE</li>
  <li>🛡️ <strong>CompTIA</strong> — Security+, Network+, A+, CySA+</li>
  <li>🟥 <strong>Red Hat</strong> — RHCSA, RHCE, OpenShift</li>
  <li>🟠 <strong>Oracle</strong> — Database, Cloud, Java</li>
  <li>🟦 <strong>SAP</strong> — All modules</li>
  <li>🚀 <strong>Scrum.org / Scrum Alliance</strong> — PSM, CSM, PSPO</li>
  <li>⚙️ <strong>HashiCorp</strong> — Terraform, Vault</li>
</ul>

<h3 style="color:#0066cc;">What's Included:</h3>
<ul>
  <li>✅ Best-in-market enterprise pricing</li>
  <li>✅ Pre-configured CloudLabs and exam prep</li>
  <li>✅ Bulk ordering through our store</li>
  <li>✅ Free retake guarantees on select certs</li>
  <li>✅ Dedicated account manager</li>
</ul>

<div style="text-align:center;margin:20px 0;">
  <a href="https://store.synergificsoftware.com" style="background:#0066cc;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">🛒 Visit Synergific Store</a>
</div>

<p>Or reply to this email for a custom quote for {{company}}.</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "Follow-up — Soft Reminder",
    type: "email",
    category: "Follow-up",
    subject: "Quick Follow-up — Synergific Software",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
${HEADER}
<p>Hi {{name}},</p>

<p>I just wanted to circle back on my previous email about how <strong>Synergific Software</strong> can support {{company}} with IT services and team training.</p>

<p>I know inboxes get busy, so I'll keep it short:</p>

<ul>
  <li>🎓 <strong>200+ training courses</strong> across cloud, DevOps, AI/ML, cybersecurity</li>
  <li>☁️ <strong>End-to-end IT services</strong> — Cloud, DevOps, AI, Security, Custom Dev</li>
  <li>🏆 <strong>500+ enterprise clients</strong>, ISO certified, 50+ OEM partnerships</li>
  <li>💰 <strong>Enterprise pricing</strong> on certification vouchers and CloudLabs</li>
</ul>

${ALL_PARTNER_LOGOS}

<p>Even a 15-minute call would help me understand if there's a fit. Are you free this week?</p>

${SIGNATURE}
</div>`,
  },

  // ─── WHATSAPP ────────────────────────────────────────
  {
    name: "WhatsApp — Quick Intro",
    type: "whatsapp",
    category: "IT Services",
    subject: null,
    body: `Hi {{name}}! 👋

I'm reaching out from *Synergific Software* — ISO certified IT services & training company.

We help businesses like {{company}} with:
☁️ Cloud (AWS/Azure/GCP)
⚙️ DevOps & Automation
🤖 AI/ML Solutions
🛡️ Cybersecurity
🎓 200+ Training Courses
📜 1,100+ Certification Vouchers

500+ enterprise clients trust us. Would you be open to a quick chat?

📞 +91 8884 907 660
🌐 synergificsoftware.com
🛒 store.synergificsoftware.com`,
  },
  {
    name: "WhatsApp — Training Promo",
    type: "whatsapp",
    category: "Training",
    subject: null,
    body: `Hi {{name}}! 🎓

*Synergific Software* offers 200+ tech training courses for {{company}}'s team:

☁️ AWS, Azure, GCP (36+ courses)
🤖 AI/ML, Generative AI (15+ courses)
⚙️ DevOps, Kubernetes (20+ courses)
📊 Big Data, Power BI, Tableau (14+ courses)
🚀 Agile, Scrum, SAFe (11+ courses)

✅ Live instructor-led
✅ Hands-on CloudLabs
✅ Certification vouchers at enterprise pricing
✅ Custom corporate batches

Reply to know more!
📞 +91 8884 907 660
🌐 synergificsoftware.com
🛒 store.synergificsoftware.com`,
  },

  // ─── CLOUD PORTAL TEMPLATES (plain business email style) ─────────
  {
    name: "Cloud Portal — B2B Pitch (80% Cost Savings)",
    type: "email",
    subject: "Your training labs — 80% cheaper, 10x faster",
    category: "Cloud Portal",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.7;">
<p>Hi {{name}},</p>

<p>I noticed that <strong>{{company}}</strong> offers technical training. I'd love to show you how our clients are delivering the same hands-on labs at <strong>80% lower cost</strong>, with <strong>zero setup time</strong> for students.</p>

<p><strong>What we offer:</strong></p>
<ul style="padding-left:20px;">
  <li>103+ pre-built lab environments (Docker, Kubernetes, Kafka, Spark, AI/ML, ELK, and more)</li>
  <li>Real AWS / Azure / GCP sandbox accounts with auto-cleanup</li>
  <li>Fully browser-based access — no installations required</li>
  <li>Deploy 25 student labs in under 2 minutes</li>
  <li>Auto-generated lab completion certificates for compliance</li>
</ul>

<p><strong>The impact:</strong></p>
<p style="margin:4px 0;">Your current VM-based approach: <strong>~₹2,000 per seat</strong></p>
<p style="margin:4px 0;">Our cloud-native lab platform: <strong>~₹400 per seat</strong></p>
<p style="margin:4px 0;"><strong>Increase your margin by ₹1,600 per seat</strong></p>

<p style="margin-top:16px;">
  <img src="${LOGO.aws}" alt="AWS" style="${LOGO_STYLE}" />
  <img src="${LOGO.azure}" alt="Azure" style="${LOGO_STYLE}" />
  <img src="${LOGO.gcp}" alt="GCP" style="${LOGO_STYLE}" />
  <img src="${LOGO.docker}" alt="Docker" style="${LOGO_STYLE}" />
  <img src="${LOGO.kubernetes}" alt="Kubernetes" style="${LOGO_STYLE}" />
  <img src="${LOGO.kafka}" alt="Kafka" style="${LOGO_STYLE}" />
  <img src="${LOGO.terraform}" alt="Terraform" style="${LOGO_STYLE}" />
  <img src="${LOGO.jenkins}" alt="Jenkins" style="${LOGO_STYLE}" />
</p>

<p>Would you be open to a quick <strong>15-minute demo this week?</strong> I can deploy a live lab for you instantly so you can experience it firsthand.</p>

${SIGNATURE}
</div>`,
  },
  {
    name: "Cloud Portal — 12 USPs Overview",
    type: "email",
    subject: "12 things no other training lab platform can do",
    category: "Cloud Portal",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
    <p>Hi {{name}},</p>
    <p>Here's what sets our Cloud Portal apart from every other lab platform in the market:</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">🤖 <strong>AI Course Analyzer</strong> — Upload a PDF → get a deployment-ready template in 60 sec</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">⚡ <strong>30-Second Deploy</strong> — Full Kafka+Spark+MySQL stack live in a browser tab</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">💰 <strong>85% Cheaper</strong> — Containers vs VMs: ₹10,080 vs ₹54,000 for a 3-day bootcamp</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">🌐 <strong>4 Cloud Providers</strong> — AWS + Azure + GCP + Containers, one dashboard</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">📦 <strong>33 Lab Images</strong> — Big Data, DevOps, AI/ML, Security, Monitoring, Desktop</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">🏷️ <strong>White-Label Ready</strong> — Your brand, your portal, your logo</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">🔄 <strong>Auto-Cleanup</strong> — TTL-based deletion across all clouds. Zero orphans.</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">🌙 <strong>Smart Cost Optimization</strong> — Idle auto-stop + night pause saves 40-60%</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">📊 <strong>Profit Dashboard</strong> — Real-time P&L across all cloud providers</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">👁️ <strong>Trainer Screen Shadow</strong> — Watch any student's screen live (industry first)</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">📄 <strong>Lab Certificates</strong> — Auto-generated from real usage data</td></tr>
      <tr><td style="padding:8px 0;">🚀 <strong>Bulk Deploy</strong> — 25 seats provisioned + welcome emails sent in one click</td></tr>
    </table>

    <div style="text-align:center;margin:16px 0;">
      <img src="${LOGO.docker}" alt="Docker" style="${LOGO_STYLE_SM}" />
      <img src="${LOGO.kubernetes}" alt="K8s" style="${LOGO_STYLE_SM}" />
      <img src="${LOGO.kafka}" alt="Kafka" style="${LOGO_STYLE_SM}" />
      <img src="${LOGO.spark}" alt="Spark" style="${LOGO_STYLE_SM}" />
      <img src="${LOGO.terraform}" alt="Terraform" style="${LOGO_STYLE_SM}" />
      <img src="${LOGO.tensorflow}" alt="TensorFlow" style="${LOGO_STYLE_SM}" />
      <img src="${LOGO.prometheus}" alt="Prometheus" style="${LOGO_STYLE_SM}" />
      <img src="${LOGO.grafana}" alt="Grafana" style="${LOGO_STYLE_SM}" />
    </div>

    <p>Ready to see it live? I can spin up a Kafka + Spark lab for you in 30 seconds on a call.</p>

    <p>👉 <a href="https://portal.synergificsoftware.com" style="color:#0066cc;font-weight:600;">Explore the portal → portal.synergificsoftware.com</a></p>

    ${SIGNATURE}
  </div>
</div>`,
  },
  {
    name: "Cloud Portal — Competitor Comparison",
    type: "email",
    subject: "How we compare to Whizlabs, CloudLabs & KodeKloud",
    category: "Cloud Portal",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
    <p>Hi {{name}},</p>
    <p>You're evaluating lab platforms for your training business. Here's how we genuinely compare — no fluff, just facts:</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:12px;" border="1" cellpadding="8" cellspacing="0">
      <thead>
        <tr style="background:#0066cc;color:white;text-align:left;">
          <th style="padding:8px;">Feature</th>
          <th style="padding:8px;">Synergific</th>
          <th style="padding:8px;">Others</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Real cloud accounts (AWS+Azure+GCP)</td><td style="color:green;font-weight:bold;">✅ All 3</td><td>Azure-only or GCP-only</td></tr>
        <tr style="background:#f5f5f5;"><td>Container labs (33 images)</td><td style="color:green;font-weight:bold;">✅</td><td>❌ or limited</td></tr>
        <tr><td>AI course analyzer</td><td style="color:green;font-weight:bold;">✅</td><td>❌ Nobody else</td></tr>
        <tr style="background:#f5f5f5;"><td>Deploy time</td><td style="color:green;font-weight:bold;">&lt;30 sec</td><td>5-20 min</td></tr>
        <tr><td>Auto-cleanup at TTL</td><td style="color:green;font-weight:bold;">✅ All clouds</td><td>Manual or Azure-only</td></tr>
        <tr style="background:#f5f5f5;"><td>White-label</td><td style="color:green;font-weight:bold;">✅</td><td>❌</td></tr>
        <tr><td>Trainer screen shadow</td><td style="color:green;font-weight:bold;">✅</td><td>❌</td></tr>
        <tr style="background:#f5f5f5;"><td>Bulk deploy (N seats)</td><td style="color:green;font-weight:bold;">✅</td><td>❌</td></tr>
        <tr><td>Lab completion certificates</td><td style="color:green;font-weight:bold;">✅</td><td>❌</td></tr>
        <tr style="background:#f5f5f5;"><td>Profit dashboard (P&amp;L)</td><td style="color:green;font-weight:bold;">✅</td><td>❌</td></tr>
        <tr><td>Starting price</td><td style="color:green;font-weight:bold;">₹199/session</td><td>₹4,999/mo+</td></tr>
      </tbody>
    </table>

    <p>The bottom line: we're <strong>85% cheaper, 10x faster</strong>, and offer features nobody else has.</p>

    <p>👉 <a href="https://portal.synergificsoftware.com" style="color:#0066cc;font-weight:600;">Start your free trial → portal.synergificsoftware.com</a></p>

    ${SIGNATURE}
  </div>
</div>`,
  },
  {
    name: "Cloud Portal — Training Company CEO",
    type: "email",
    subject: "Cut your lab infrastructure cost by 80%",
    category: "Cloud Portal",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
    <p>Hi {{name}},</p>

    <p>If <strong>{{company}}</strong> runs technical training with hands-on labs, your biggest pain points are probably:</p>

    <ul style="padding-left:20px;margin:12px 0;">
      <li>💸 High cloud infrastructure costs eating your margins</li>
      <li>⏳ 15-30 minutes to provision each student's environment</li>
      <li>😰 Orphan resources running up surprise bills</li>
      <li>🔧 Manual setup and cleanup for every batch</li>
    </ul>

    <p>We solve all four:</p>

    <div style="margin:16px 0;">
      <table style="width:100%;font-size:13px;" cellpadding="6" cellspacing="0">
        <tr><td style="width:40%;color:#666;">3-day bootcamp (25 students)</td><td style="text-decoration:line-through;color:#999;">₹54,000 (VMs)</td><td style="color:#0066cc;font-weight:bold;">₹10,080 (containers)</td></tr>
        <tr><td style="color:#666;">Provision time</td><td style="text-decoration:line-through;color:#999;">30 min/student</td><td style="color:#0066cc;font-weight:bold;">30 sec/student</td></tr>
        <tr><td style="color:#666;">Cleanup</td><td style="text-decoration:line-through;color:#999;">Manual</td><td style="color:#0066cc;font-weight:bold;">Automatic at TTL</td></tr>
        <tr><td style="color:#666;">Orphan risk</td><td style="text-decoration:line-through;color:#999;">High</td><td style="color:#0066cc;font-weight:bold;">Zero</td></tr>
      </table>
    </div>

    <p>Your margin improves by <strong>₹1,600 per seat</strong>. That's ₹40,000 extra profit on a single 25-seat batch.</p>

    <p>Shall I show you in 15 minutes? I'll deploy a live lab during the call.</p>

    <p>👉 <a href="https://portal.synergificsoftware.com" style="color:#0066cc;font-weight:600;">Book a 15-min demo → portal.synergificsoftware.com</a></p>

    ${SIGNATURE}
  </div>
</div>`,
  },
  {
    name: "Cloud Portal — DevOps/CTO Technical Pitch",
    type: "email",
    subject: "33 lab images — Kafka, K8s, Terraform, ELK — deploy in 30 sec",
    category: "Cloud Portal",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
    <p>Hi {{name}},</p>

    <p>Our Cloud Portal has <strong>33 container images</strong> ready to deploy — no build, no pull, no config:</p>

    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:16px 0;" cellpadding="6" cellspacing="0">
      <tr style="background:#f0f7ff;font-weight:bold;"><td>Category</td><td>Images</td></tr>
      <tr><td>Big Data</td><td>Kafka + Spark + MySQL, Kafka + Spark + Cassandra</td></tr>
      <tr style="background:#fafafa;"><td>DevOps</td><td>Docker + K8s, Jenkins + GitLab CI + ArgoCD, Terraform + multi-cloud CLIs, Ansible + managed nodes</td></tr>
      <tr><td>AI/ML</td><td>TensorFlow + PyTorch + HuggingFace + JupyterLab</td></tr>
      <tr style="background:#fafafa;"><td>Monitoring</td><td>Prometheus + Grafana + Alertmanager</td></tr>
      <tr><td>Security</td><td>Kali Linux (full pentest suite)</td></tr>
      <tr style="background:#fafafa;"><td>Web Dev</td><td>MEAN/MERN + MongoDB + Redis</td></tr>
      <tr><td>Observability</td><td>ELK Stack (Elasticsearch + Logstash + Kibana)</td></tr>
      <tr style="background:#fafafa;"><td>Desktop</td><td>Ubuntu, Fedora, Arch, Rocky, AlmaLinux, Alpine</td></tr>
    </table>

    <p><strong>Idle auto-stop</strong> saves ~40%. <strong>Night pause</strong> saves ~37%. <strong>Auto-cleanup at TTL</strong> means zero orphan resources, zero surprise bills.</p>

    <p>All managed from one portal with real AWS, Azure, and GCP sandbox accounts.</p>

    <p>👉 <a href="https://portal.synergificsoftware.com" style="color:#0066cc;font-weight:600;">Try it free → portal.synergificsoftware.com</a></p>

    ${SIGNATURE}
  </div>
</div>`,
  },
  {
    name: "Cloud Portal — LinkedIn Outreach",
    type: "email",
    subject: "Re: Your cloud training labs",
    category: "Cloud Portal",
    body: `<div style="font-family:Arial,sans-serif;color:#333;font-size:14px;line-height:1.6;">
  <div style="padding:24px;font-size:14px;line-height:1.8;">
    <p>Hi {{name}},</p>

    <p>I came across {{company}} and noticed you offer cloud/DevOps training. Quick question:</p>

    <p><strong>How are your students accessing hands-on labs today?</strong></p>

    <p>We built a portal that lets training companies like yours:</p>

    <ul style="padding-left:20px;">
      <li>Deploy 33 different lab environments in <strong>30 seconds</strong> (Kafka, K8s, Terraform, AI/ML, ELK...)</li>
      <li>Give students <strong>real AWS/Azure/GCP sandbox accounts</strong> (not simulators)</li>
      <li>Provision <strong>25 seats in one click</strong> with auto-welcome emails</li>
      <li>Auto-cleanup at expiry — <strong>zero orphan resources</strong></li>
    </ul>

    <p>The result: <strong>80% lower lab costs</strong> and <strong>zero setup time</strong> for students.</p>

    <p>Would a 15-minute demo be worth your time this week? I can deploy a live Kafka + Spark lab during the call.</p>

    <p>Best,</p>

    ${SIGNATURE}
  </div>
</div>`,
  },
  {
    name: "WhatsApp — Cloud Portal Quick Pitch",
    type: "whatsapp",
    subject: null,
    category: "Cloud Portal",
    body: `Hi {{name}} 👋

I'm from Synergific Software. We built a Cloud Lab Portal for training companies:

✅ 33 pre-built lab images (Kafka, K8s, Docker, Terraform, AI/ML, ELK)
✅ Deploy in 30 seconds — browser-based, no installs
✅ Real AWS/Azure/GCP sandbox accounts
✅ 85% cheaper than VM-based labs
✅ Auto-cleanup — zero orphan resources

Your students click a link and they're inside a running Kafka + Spark + MySQL lab. No setup. No VPN. No SSH keys.

Want a quick demo? I can deploy a live lab for you in 30 seconds.

🌐 portal.synergificsoftware.com
📞 +91 8884 907 660`,
  },
];

export async function POST() {
  // Delete existing template seeds with the same names to avoid duplicates
  await prisma.messageTemplate.deleteMany({
    where: { name: { in: TEMPLATES.map((t) => t.name) } },
  });

  const created = await Promise.all(
    TEMPLATES.map((t) => prisma.messageTemplate.create({ data: t }))
  );

  return NextResponse.json({ success: true, count: created.length, templates: created.map((t) => t.name) });
}
