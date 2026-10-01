async function runVerification() {
  const API = 'http://localhost:3001';

  console.log('--- Step 1: Create Job ---');
  const jobData = {
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    experienceLevel: 'Senior',
    description: 'Looking for a Senior Full Stack Engineer proficient in React, Node.js, TypeScript, PostgreSQL, and Docker containerization.',
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'Docker', 'PostgreSQL'],
    preferredSkills: ['Kubernetes', 'Redis', 'AWS'],
    createdBy: 'recruiter-demo',
    companyName: 'TechCorp Innovations',
  };
  const jobRes = await fetch(API + '/api/jobs/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  }).then(r => r.json());
  console.log('Job create response:', jobRes);
  const jobId = jobRes.job?.id;
  console.log('Created Job ID:', jobId);

  console.log('\n--- Step 2: Candidates Apply ---');
  const resumeTextAlex = [
    'Alex Johnson',
    'Software Engineer with 3 years building web interfaces with React and JavaScript.',
    'Experience:',
    '- Frontend Engineer at WebCo (2022-2024): Built dashboard using React and CSS.',
    '- Junior Dev at StartupX (2021-2022): Worked on HTML/CSS and basic APIs.',
    'Skills: React, JavaScript, HTML, CSS, Git, Python'
  ].join('\n');

  const formAlex = new FormData();
  formAlex.append('studentId', 'student-alex');
  formAlex.append('studentName', 'Alex Johnson');
  formAlex.append('studentEmail', 'alex@example.com');
  formAlex.append('resumeText', resumeTextAlex);
  const blobAlex = new Blob([resumeTextAlex], { type: 'text/plain' });
  formAlex.append('resume', blobAlex, 'Alex_Johnson_Resume.txt');

  const alexApp = await fetch(API + '/api/jobs/' + jobId + '/apply', {
    method: 'POST',
    body: formAlex,
  }).then(r => r.json());
  console.log('Alex applied applicationId:', alexApp.applicationId);

  const resumeTextRia = [
    'Ria Sharma',
    'Senior Engineer with 5 years experience in React, Node.js, TypeScript, PostgreSQL, Docker.',
    'Experience:',
    '- Full Stack Lead at CloudScale (2021-Present): Designed Node.js microservices with TypeScript and PostgreSQL, deployed via Docker containers.',
    '- Frontend Engineer at TechWorks (2019-2021): Built React web applications with state management.',
    'Skills: React, Node.js, TypeScript, Docker, PostgreSQL, Redis, AWS'
  ].join('\n');

  const formRia = new FormData();
  formRia.append('studentId', 'student-ria');
  formRia.append('studentName', 'Ria Sharma');
  formRia.append('studentEmail', 'ria@example.com');
  formRia.append('resumeText', resumeTextRia);
  const blobRia = new Blob([resumeTextRia], { type: 'text/plain' });
  formRia.append('resume', blobRia, 'Ria_Sharma_Resume.txt');

  const riaApp = await fetch(API + '/api/jobs/' + jobId + '/apply', {
    method: 'POST',
    body: formRia,
  }).then(r => r.json());
  console.log('Ria applied applicationId:', riaApp.applicationId);

  console.log('\n--- Step 3: Run AI Analysis ---');
  const analyzeRes = await fetch(API + '/api/jobs/' + jobId + '/analyze', { method: 'POST' }).then(r => r.json());
  console.log('AI Analysis result:', analyzeRes);

  console.log('\n--- Step 4: Inspect AI Candidate Analysis ---');
  const alexAnalysisRes = await fetch(API + '/api/jobs/' + jobId + '/analysis/' + alexApp.applicationId).then(r => r.json());
  console.log('Alex Match Score:', alexAnalysisRes.analysis?.match_score);
  console.log('Alex Missing Requirements:', alexAnalysisRes.analysis?.missing_requirements);

  console.log('\n--- Step 5: Recruiter Rejects Alex with Reason ---');
  const alexDecision = await fetch(API + '/api/jobs/' + jobId + '/applications/' + alexApp.applicationId + '/decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'rejected',
      rejectionReason: 'Missing required technical skills: Docker and PostgreSQL. Resume lacks demonstrated backend production experience.',
      decidedBy: 'Lead Recruiter',
    }),
  }).then(r => r.json());
  console.log('Alex rejection result:', alexDecision);

  console.log('\n--- Step 6: Recruiter Accepts Ria with Notes ---');
  const riaDecision = await fetch(API + '/api/jobs/' + jobId + '/applications/' + riaApp.applicationId + '/decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'accepted',
      decisionNotes: 'Exceptional match with verified Docker and PostgreSQL production evidence. Shortlisted for Technical Round 1.',
      decidedBy: 'Lead Recruiter',
    }),
  }).then(r => r.json());
  console.log('Ria acceptance result:', riaDecision);

  console.log('\n--- Step 7: Verify Student Dashboard for Rejected Student ---');
  const alexDashboard = await fetch(API + '/api/jobs/student/student-alex/applications').then(r => r.json());
  const alexCard = alexDashboard.applications?.find(a => a.jobId === jobId);
  console.log('Alex Dashboard application state:', {
    jobTitle: alexCard?.jobTitle,
    companyName: alexCard?.companyName,
    status: alexCard?.status,
    rejectionReason: alexCard?.rejectionReason,
    missing_requirements: alexCard?.missing_requirements,
  });

  console.log('\n--- Step 8: Verify Student Dashboard for Accepted Student ---');
  const riaDashboard = await fetch(API + '/api/jobs/student/student-ria/applications').then(r => r.json());
  const riaCard = riaDashboard.applications?.find(a => a.jobId === jobId);
  console.log('Ria Dashboard application state:', {
    jobTitle: riaCard?.jobTitle,
    companyName: riaCard?.companyName,
    status: riaCard?.status,
    decisionNotes: riaCard?.decisionNotes,
  });

  if (alexCard?.status === 'rejected' && alexCard?.rejectionReason && riaCard?.status === 'accepted') {
    console.log('\n>>> SUCCESS: Both Accept and Reject flows with reasons and notes verified end-to-end! <<<');
  } else {
    throw new Error('Verification assertion failed.');
  }
}

runVerification().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
