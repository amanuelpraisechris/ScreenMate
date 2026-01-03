// Mock data for Silvi clone

export const navigationItems = [
  { label: 'News', href: '#news' },
  { label: 'Citations', href: '#citations' },
  { label: 'Get started', href: '#get-started' },
  { label: 'About', href: '#about' },
  { label: 'Pricing', href: '#pricing' },
];

export const mediaLogos = [
  { name: 'Dagens Pharma', image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&h=50&fit=crop' },
  { name: 'Sundhedsmonitor', image: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&h=50&fit=crop' },
  { name: 'DR', image: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=150&h=50&fit=crop' },
  { name: 'Medicoteknik', image: 'https://images.unsplash.com/photo-1614332287897-cdc485fa562d?w=150&h=50&fit=crop' },
  { name: 'Medwatch', image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&h=50&fit=crop' },
];

export const databaseIntegrations = [
  { name: 'ERIC', icon: '📚', color: '#4A7C59' },
  { name: 'OpenAlex', icon: '🔬', color: '#C74B4B' },
  { name: 'PubMed', icon: '🏥', color: '#2E5984' },
  { name: 'Zotero', icon: '📖', color: '#CC2936' },
];

export const features = [
  {
    id: 'collect',
    title: 'Collect studies from anywhere',
    description: 'When you review literature in Silvi you can import studies from anywhere. Silvi is even integrated directly to some databases, letting you save a search with one click.',
    imagePosition: 'right',
  },
  {
    id: 'screen',
    title: 'Screen studies efficiently',
    description: 'Silvi lets you screen studies for your literature review. You can include or exclude studies in bulk or one-by-one, whatever suits your workflow. If you want some help, you can also get AI screening suggestions in Silvi.',
    imagePosition: 'left',
    link: { text: 'Learn more', href: '#bulk-screening' },
  },
  {
    id: 'extract',
    title: 'Extract data transparently',
    description: 'Highlight directly text directly in a PDF to extract data with Silvi. The data and the highlight will automatically be stored so you never loose track of where the data came from. You can extract numbers, text and categories for coding.',
    imagePosition: 'right',
    link: { text: 'Learn more', href: '#data-extraction' },
  },
  {
    id: 'ai-extract',
    title: 'Use AI to extract data',
    description: 'It is often easier to judge if other\'s work is correct or not. Let Silvi extract data for you and then it is up to you to judge if it is correct or not. All data is highlighted in the PDF and you can always correct the data yourself— leaving you in full control.',
    imagePosition: 'left',
    link: { text: 'Learn more', href: '#ai-extraction' },
  },
  {
    id: 'tables',
    title: 'Make tables & plots',
    description: 'All the data you extract with Silvi is easily accessible in tables that you can configure how you like. You can also generate plots of your data to get a nice overview. Everything can be exported to the format you like.',
    imagePosition: 'right',
  },
  {
    id: 'collaborate',
    title: 'Collaborate as a team',
    description: 'Reviewing literature is much easier done in teams. Silvi lets you assign tasks, require review by multiple reviewers, blinding each others decisions and much more.',
    imagePosition: 'left',
    link: { text: 'Learn more', href: '#adding-colleagues' },
  },
];

export const pricingPlans = [
  {
    name: 'Basic',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'No credit card needed.',
    features: [
      'Unlimited number of reviews',
      'Easy screening',
      'Transparent data extraction',
    ],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Rapid',
    monthlyPrice: 39,
    yearlyPrice: 19,
    yearlyBilled: 228,
    description: 'Billed as €228 yearly.',
    features: [
      'Everything in Basic',
      'Bulk screening',
      'AI for screening',
      'AI for data extraction',
    ],
    cta: 'Continue with Rapid',
    highlighted: true,
  },
  {
    name: 'Plus',
    monthlyPrice: 99,
    yearlyPrice: 59,
    yearlyBilled: 708,
    description: 'Billed €708 yearly.',
    features: [
      'Everything in Rapid',
      'Integration with PubMed',
      'Collaborative reviews',
      'Blinding of others decisions',
    ],
    cta: 'Continue with Plus',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    description: 'Billed annually',
    features: [
      'For large organizations',
      'Custom integrations',
      'Single-Sign On',
      'Flexible invoicing',
    ],
    cta: 'Talk to us',
    highlighted: false,
  },
];

export const newsArticles = [
  {
    id: 1,
    title: 'Promising insights from Evidence in AI project shared with Nordic Medicine Agencies',
    date: 'October 3, 2025',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=250&fit=crop',
    color: '#5B9BD5',
  },
  {
    id: 2,
    title: 'Silvi joins partnership to develop AI solutions for Evidence Based Medicine',
    date: 'May 9, 2025',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=250&fit=crop',
    color: '#7B68A6',
  },
  {
    id: 3,
    title: 'Technical University of Denmark chooses Silvi as literature review platform',
    date: 'January 7, 2025',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=250&fit=crop',
    color: '#6B8E7B',
  },
];

export const footerLinks = {
  comparisons: [
    { label: 'Silvi vs Covidence', href: '#' },
    { label: 'Silvi vs Rayyan', href: '#' },
  ],
  importFrom: [
    { label: 'PubMed', href: '#' },
    { label: 'OpenAlex', href: '#' },
    { label: 'Web of Science', href: '#' },
    { label: 'ERIC', href: '#' },
    { label: 'Zotero', href: '#' },
    { label: 'Mendeley', href: '#' },
    { label: 'EndNote', href: '#' },
  ],
  product: [
    { label: 'Silvi 101', href: '#' },
    { label: 'Help', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Citations', href: '#' },
  ],
  company: [
    { label: 'Consultancy', href: '#' },
    { label: 'News', href: '#' },
    { label: 'About us', href: '#' },
    { label: 'Get in contact', href: '#' },
  ],
};
