// Everything about me that more than one page needs. Links set to null are not
// rendered; fill them in and they appear in the hero, footer and JSON-LD.

export const site = {
  name: 'Amogh D. Prasanna',
  fullName: 'Amogh Doddagadduvalli Prasanna',
  tagline: 'Teaching noisy quantum hardware to compute correctly.',
  titleSuffix: 'Quantum error correction and QML',
  description:
    'Graduate researcher at the University of Maryland working on quantum error correction, quantum machine learning under real hardware noise, and compiling for qudits.',
  role: 'Graduate researcher',
  affiliation: 'University of Maryland, College Park',
  email: 'amoghdp@umd.edu',
  links: {
    cv: '/cv.pdf',
    github: 'https://github.com/amoghdprasanna',
    linkedin: 'https://www.linkedin.com/in/amogh-d-p',
    // TODO(confirm): add your Google Scholar profile URL once it exists.
    scholar: null as string | null,
    // TODO(confirm): add your ORCID iD URL, e.g. https://orcid.org/0000-0000-0000-0000
    orcid: null as string | null,
    // The shared qubit on my GitHub profile: anyone can apply a gate by opening an issue.
    qubit: 'https://github.com/amoghdprasanna',
    qubitGate: (g: string) =>
      `https://github.com/amoghdprasanna/amoghdprasanna/issues/new?title=qubit%3A+${g}&body=Press+Submit.+A+bot+applies+the+gate+within+a+minute.`,
    photos: 'https://vsco.co/amogh66/gallery',
  },
};

export const pageTitle = (title?: string) =>
  title ? `${title} · ${site.name}` : `${site.name} · ${site.titleSuffix}`;
