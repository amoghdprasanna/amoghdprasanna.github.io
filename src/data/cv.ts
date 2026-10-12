// CV facts, copied from the resume (Resume__Amogh_D_Prasanna_-2.pdf, Oct 2026)
// unless a comment says otherwise. Used by the homepage and /cv.

export const education = [
  {
    school: 'University of Maryland, College Park',
    place: 'College Park, MD',
    dates: 'Aug 2025 – May 2027',
    degree: 'Masters in Computer Science Equivalent',
    detail: 'GPA 3.9/4.0',
  },
  {
    school: 'Visvesvaraya Technological University',
    place: 'India',
    degree: 'Bachelors in Computer Science and Engineering',
  },
];

export const research = [
  {
    org: 'University of Maryland, College Park',
    role: 'Graduate Research Assistant, advised by Dr. Shabnam Jabeen',
    dates: 'Jan 2026 – present',
    points: [
      'Machine learning for qudit unitary decomposition, advised by Dr. Tanay Roy (SQMS, Fermilab): compiling arbitrary SU(d) unitaries into high-fidelity sequences of native gates on superconducting transmon qudits, with leakage and anharmonicity in the training objective.',
      'Quantum generative modeling: a quantum circuit Born machine in JAX for hadron momentum distributions from Pythia 8, reaching KL divergence below 0.14 under FakeBrisbane noise with zero-noise extrapolation and dynamical decoupling.',
      'A hardware-efficient ansatz reaching a transverse-momentum KS score of about 0.075 with only 32 native ECR gates under FakeBrisbane noise.',
      'Circuit-depth and entanglement ablations comparing trainable RXX and fixed CX gates.',
    ],
  },
  {
    org: 'Open-source decoding toolkit',
    role: 'Contributor',
    dates: 'Jun 2026 – present',
    points: ['Algorithm frameworks in Python and C++ for simulating and decoding topological codes; pull request review and benchmark analysis.'],
  },
];

export const coursework = [
  { code: 'CMSC657', title: 'Quantum Information Processing', who: 'Andrew Childs' },
  { code: 'CMSC858G', title: 'Quantum Error Correction and Fault Tolerance', who: 'Daniel Gottesman' },
  { code: 'CMSC858L', title: 'Quantum Complexity', who: 'Daniel Gottesman', note: 'Fall 2026, in progress' },
];

export const schools = [
  { title: 'IBM Global Summer School (selected)', year: '2026' },
  { title: 'RQS Simulation Summer School, UMD (selected)', year: '2026' },
];

export const industry = [
  {
    org: 'Mercedes-Benz Research and Development India',
    // The Oct 2025 resume splits this into an application development
    // internship (Mar to Jul 2023) and Software Consultant (Aug 2023 to Aug 2025).
    role: 'Software Engineer',
    place: 'Bengaluru',
    dates: 'Mar 2023 – Aug 2025',
    points: [
      'Production C++ and Python in an agile team; a 10x cut in data processing time from better data structures and object-oriented design.',
      'Built and maintained a cloud-hosted API gateway on AWS in front of SQL and NoSQL backends for release operations.',
      'Low-level libcurl DLL work, and eSign software handling secure classification and storage of release data.',
    ],
  },
  {
    org: 'Aujas Cybersecurity',
    role: 'Purple Team Security Intern',
    place: 'Bengaluru',
    dates: 'Mar 2022 – Jun 2022',
    points: ['Red and purple team penetration tests against Active Directory endpoints using the MITRE ATT&CK framework.'],
  },
];

export const awards = [
  'Winner, TechPilot Hackathon (YC × Cactus), 2026',
  'Runner-up, GenAI Hackathon, Mercedes-Benz R&D India',
];

export const skills = [
  { area: 'Quantum computing', items: 'Qiskit, Qiskit Aer, IBM Quantum noise models, variational algorithms, quantum circuit Born machines, error mitigation' },
  { area: 'Machine learning', items: 'JAX (JIT, autodiff), PyTorch, generative modeling, SPSA and gradient-based optimization, KL and KS benchmarking' },
  { area: 'Scientific computing', items: 'NumPy, SciPy, Pythia 8, numerical methods, linear algebra' },
  { area: 'Programming', items: 'Python, C++, TypeScript, Go, SQL, Bash, Git, Linux' },
];
