import { u } from './taxonomy';

export const siteSettings = {
  brandName: 'PDN Travel',
  legalName: 'Peace Destination Nepal Pvt. Ltd.',
  tagline: 'Explore with love. Cherish our planet.',
  phone: '+971 50 717 1487',
  whatsapp: '971507171487',
  email: 'contact@pdntravel.com',
  address: 'Kathmandu Metropolitan City-32, Koteshwor, Kathmandu, Nepal',
  officeHours: 'Sunday – Friday · 9:00 – 18:00 (Nepal time)',
  footerBlurb: 'Travel is not just about reaching a destination — it’s about how you live the journey.',
  mapQuery: 'Koteshwor, Kathmandu, Nepal',
  socials: {
    facebook: 'https://www.facebook.com/pdntravelagency',
    instagram: 'https://www.instagram.com/pdn_travel',
    twitter: '',
    linkedin: '',
    youtube: '',
  },
  affiliation: { label: 'Affiliated with Nepal Tourism Board', url: 'https://ntb.gov.np/' },
};

export const homeSettings = {
  announcement: { tag: 'New', text: 'World Tourism Day 2026 — PDN grand opening', link: '#tourism-day' },
  heroMarker: { eyebrow: 'You are here', text: 'Earth — 195 countries to explore' },
  heroSlides: [
    {
      eyebrow: 'Discover new destinations with us',
      titleLead: 'Explore your',
      titleAccent: 'dream',
      titleTail: 'places',
      body: 'From scorching deserts to freezing mountains, steamy rainforests to vibrant cities — uncover the cultures, religions and traditions that make every place extraordinary.',
    },
    {
      eyebrow: 'Himalayan journeys',
      titleLead: 'Walk where the',
      titleAccent: 'sky',
      titleTail: 'begins',
      body: 'Guided treks to Everest and Annapurna with the local experts who call these mountains home.',
    },
    {
      eyebrow: 'Atithi Devo Bhava',
      titleLead: 'Travel is how you',
      titleAccent: 'live',
      titleTail: 'the journey',
      body: 'Responsible, immersive journeys planned with care by a government-authorised agency registered in Nepal since 2014.',
    },
  ],
  stats: [
    { value: '1.2M+', label: 'Hotels worldwide' },
    { value: '200+', label: 'Countries & regions' },
    { value: '5,000+', label: 'Cities with flights' },
    { value: '24/7', label: 'Award-winning support' },
  ],
  continents: {
    eyebrow: 'Explore by continent',
    titleLead: 'Where on',
    titleAccent: 'Earth',
    titleTail: 'next?',
    body: 'Explore the wonders of the natural world, where the emotions of animals and unique human stories come alive.',
  },
  countries: { eyebrow: 'Featured countries', titleLead: 'Handpicked for your next', titleAccent: 'escape' },
  trips: {
    eyebrow: 'Featured journeys',
    titleLead: 'Trips our travellers',
    titleAccent: 'love',
    body: 'Hover a card to preview the photos and price — every itinerary can be tailored to you.',
  },
  activities: {
    eyebrow: 'Travel by passion',
    titleLead: 'Find your kind of',
    titleAccent: 'adventure',
    body: 'Trekking at dawn, cycling through villages, wild swimming or a quiet temple visit — start with what you love.',
  },
  why: {
    eyebrow: 'Why travel with PDN',
    title: 'Discover New Destinations With Us!',
    body: 'Explore the wonders of the natural world, where the emotions of animals and unique human stories come alive. From scorching deserts to freezing mountains, steamy rainforests to vibrant urban centers, each place offers a distinct experience. Discover diverse religions, cultures, and traditions, much like the varied biodiversity and captivating landscapes. Whether it’s sprawling agricultural lands or awe-inspiring architecture, there’s always something extraordinary to uncover.',
    facts: [
      { value: '2014', label: 'Registered in Nepal' },
      { value: 'NTB', label: 'Nepal Tourism Board partner' },
    ],
    features: [
      { icon: 'tag', title: 'Competitive pricing', body: '500+ suppliers and the purchasing power of 300 million members.' },
      { icon: 'award', title: 'Award-winning service', body: 'Real travel experts, 24 hours a day.' },
      { icon: 'globe', title: 'Worldwide coverage', body: '1,200,000+ hotels in 200+ countries, flights to 5,000+ cities.' },
      { icon: 'leaf', title: 'Responsible by design', body: 'Journeys that give back to local communities.', accent: true },
    ],
  },
  event: {
    chip: 'Save the date',
    titleLead: 'World Tourism Day',
    titleAccent: '2026',
    body: 'Please save the date for our grand opening. We’re excited to officially launch Peace Destination Nepal (PDN) — and you’re invited to celebrate with us.',
    date: '2026-09-27T10:00:00+05:45',
    dateLabel: '27 September 2026',
    location: 'Peace Destination Nepal launch',
    primaryLabel: 'Reserve my spot',
    primaryLink: '/contact?topic=World%20Tourism%20Day%202026',
    secondaryLabel: 'Add to calendar',
    countdownLabel: 'Countdown to launch · Kathmandu time',
  },
  testimonials: { eyebrow: 'Testimonials', titleLead: 'Stories from the', titleAccent: 'road' },
  newsletter: { titleLead: 'Get travel', titleAccent: 'inspiration', titleTail: 'straight to your inbox.' },
};

export const testimonials = [
  { name: 'Siddhi Paudyal', location: 'Kathmandu, Nepal', trip: 'Pokhara family trip · Dec 2023', rating: 5, quote: 'My first visit to Pokhara was magical — sunrise from Sarangkot, adventures in Kusma and a peaceful boat ride on Phewa Lake. The hotels were comfortable and everything simply worked.' },
  { name: 'Prasiddhi Paudyal', location: 'Kathmandu, Nepal', trip: 'Pokhara adventure · Dec 2023', rating: 5, quote: 'Paragliding, zip-lining and bungee in one trip! The calm of the World Peace Pagoda balanced all the adrenaline. A wonderful, memorable journey.' },
  { name: 'Riya Bhattarai', location: 'Nepal', trip: 'Pokhara family vacation · Nov 2023', rating: 5, quote: 'Our guide was experienced, friendly and genuinely cared about us. Phewa Lake, Davis Falls and Kusma were highlights — very professional service from start to finish.' },
  { name: 'Astha Neupane', location: 'Nepal', trip: 'Pokhara family vacation', rating: 5, quote: 'Beautiful nature, a kind driver, cosy rooms and excellent food. The planning was so careful that the trip went far beyond what we expected.' },
  { name: 'Ashma Neupane', location: 'Nepal', trip: 'Pokhara family trip', rating: 5, quote: 'Every viewpoint was stunning and the transport was always on time. Comfortable stays and great meals — our trip exceeded every expectation.' },
  { name: 'Pramila Neupane Paudyal', location: 'Nepal', trip: 'Pokhara family visit · 2023', rating: 5, quote: 'Temples, culture and Himalayan views together — Pokhara felt like the perfect blend of nature, adventure and tradition.' },
  { name: 'Ayush Neupane', location: 'Nepal', trip: 'Pokhara family trip', rating: 5, quote: 'Thoughtful planning, comfortable hotels, tasty food and excellent service all the way through. Highly recommended.' },
];

type Block = Record<string, unknown>;

export const pages: {
  slug: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  heroImage: string;
  navGroup: string | null;
  sortOrder: number;
  metaDescription: string;
  sections: Block[];
}[] = [
  {
    slug: 'about',
    title: 'The evolution of Peace Destination Nepal',
    eyebrow: 'About PDN',
    subtitle: 'Built on inspiration, dedication and a dream of sharing Nepal — and the world — responsibly.',
    heroImage: u('1592623171049-4be9e0f5a501', 2000),
    navGroup: 'support',
    sortOrder: 1,
    metaDescription: 'PDN Travel (Peace Destination Nepal) is a government-registered travel and tourism agency founded in Nepal in 2014.',
    sections: [
      {
        type: 'imageText',
        eyebrow: 'Our story',
        heading: 'A flight attendant’s dream',
        body: 'PDN was imagined high above the clouds by a flight attendant with Air Nepal International. Watching travellers arrive in Kathmandu year after year, he saw how much more of Nepal they could experience — its mountains, temples, art and people — if someone showed them with care.\n\nThat dream became Peace Destination Nepal: an agency that pairs physical adventure with deep cultural connection, and never forgets to protect the places that make travel special.',
        image: '/media/pdn-welcome.jpg',
        imageSide: 'right',
      },
      {
        type: 'stats',
        items: [
          { value: '2014', label: 'Registered with the Government of Nepal' },
          { value: '195', label: 'Countries we can plan journeys to' },
          { value: '8', label: 'Core principles guiding every trip' },
          { value: '24/7', label: 'Support while you travel' },
        ],
      },
      {
        type: 'richText',
        heading: 'Legally registered, genuinely local',
        body: 'Peace Destination Nepal was registered with the Government of Nepal in 2014 as an authorised leisure, travel and tourism agency. Compliance and integrity are the foundation of everything we do.\n\nFor us, travel is not only about reaching a destination — it is about how you live the journey. Our local experts share the stories behind the mountains, temples and traditions, while your safety and security remain our first priority.',
      },
      {
        type: 'cards',
        heading: 'What guides us',
        intro: 'Eight principles shape how we plan, guide and look after every guest.',
        items: [
          { icon: 'eye', title: 'Perspective', body: 'Guests sit at the centre of every decision — you are the reason we exist.' },
          { icon: 'megaphone', title: 'Message', body: 'We champion responsible exploration and care for the environments we visit.' },
          { icon: 'map', title: 'Plan', body: 'Authentic experiences built on accurate information and thoughtful strategy.' },
          { icon: 'compass', title: 'Travel experts', body: 'Specialists who design journeys around what you want to feel and see.' },
          { icon: 'users', title: 'Guides', body: 'Storytellers who bring Nepal’s heritage and landscapes to life.' },
          { icon: 'heart-pulse', title: 'Health personnel', body: 'Trained people who keep an eye on your wellbeing, especially at altitude.' },
          { icon: 'backpack', title: 'Porters', body: 'The strong, cheerful support that makes remote trails possible.' },
          { icon: 'smile', title: 'PDN Pals', body: 'Friendly hosts who share the warmth of Nepali hospitality.' },
        ],
      },
      { type: 'quote', text: 'Atithi Devo Bhava — the guest is God.', attribution: 'The philosophy of hospitality behind every PDN journey' },
      { type: 'cta', heading: 'Ready to plan your journey?', body: 'Tell us where you dream of going and our travel experts will craft the details.', buttonLabel: 'Talk to an expert', buttonLink: '/contact' },
    ],
  },
  {
    slug: 'within-the-law',
    title: 'Within the Law',
    eyebrow: 'Support',
    subtitle: 'PDN Travel is fully registered with the relevant authorities of the Government of Nepal.',
    heroImage: u('1731052368947-9f262c4e9f4c', 2000),
    navGroup: 'support',
    sortOrder: 2,
    metaDescription: 'Company, tourism and tax registrations for Peace Destination Nepal Pvt. Ltd.',
    sections: [
      {
        type: 'registrations',
        heading: 'Registrations & licences',
        intro: 'Booking with a registered operator means your trip is backed by the regulations that protect travellers in Nepal.',
        items: [
          { authority: 'Ministry of Industry, Commerce & Supplies', label: 'Office of the Company Registrar', number: '118396' },
          { authority: 'Ministry of Culture, Tourism & Civil Aviation', label: 'Department of Tourism', number: '2421' },
          { authority: 'Department of Cottage & Small Industries', label: 'Industry registration', number: '13834' },
          { authority: 'Inland Revenue Department', label: 'Permanent Account Number (PAN)', number: '601752074' },
          { authority: 'Kathmandu Metropolitan City', label: 'Ward 32 business registration', number: '4685' },
          { authority: 'Nepal Investment Mega Bank Limited (NIMB)', label: 'Bank guarantee', number: 'Issued' },
        ],
      },
      {
        type: 'richText',
        heading: 'Why it matters',
        body: 'Registered agencies must meet government standards for guides, insurance for staff and financial security. It is how we make sure every journey is safe, lawful and fair to the communities we work with.\n\nCopies of our certificates are available on request — just contact our team.',
      },
      { type: 'cta', heading: 'Questions about our credentials?', body: 'We are happy to share documents or answer any compliance questions.', buttonLabel: 'Contact us', buttonLink: '/contact' },
    ],
  },
  {
    slug: 'working-together',
    title: 'In unity, we create the path to victory',
    eyebrow: 'Working Together',
    subtitle: 'Guided by Atithi Devo Bhava, our team treats every guest like family.',
    heroImage: u('1700556581873-087bde7919a0', 2000),
    navGroup: 'support',
    sortOrder: 3,
    metaDescription: 'Meet the founder and the travel experts, guides and porters behind PDN Travel.',
    sections: [
      {
        type: 'team',
        heading: 'Our team',
        items: [
          { name: 'Prabhu Ram Paudyal', role: 'Founder, Peace Destination Nepal Pvt. Ltd.', bio: 'A nature-loving traveller and dedicated travel expert who founded PDN to create transformative journeys built on hospitality and guest happiness.', photo: '' },
          { name: 'Tushar Pant', role: 'Travel Expert & Mountain Guide', bio: 'A young entrepreneur and seasoned guide on the Manaslu, Annapurna, Langtang and Everest Base Camp routes, currently studying at the Nepal Academy of Tourism and Hotel Management.', photo: '' },
        ],
      },
      {
        type: 'cards',
        heading: 'The people behind your trip',
        items: [
          { icon: 'briefcase', title: 'Board of directors', body: 'Setting direction and holding us to our values.' },
          { icon: 'compass', title: 'Travel experts', body: 'Designing itineraries around your interests and pace.' },
          { icon: 'messages-square', title: 'PDN consultants', body: 'Your single point of contact from first idea to return home.' },
          { icon: 'heart-pulse', title: 'Health personnel', body: 'Looking after wellbeing on the trail.' },
          { icon: 'backpack', title: 'Porters', body: 'Carrying the load so you can enjoy the view.' },
          { icon: 'mountain', title: 'Tour & trekking guides', body: 'Licensed, experienced and full of stories.' },
          { icon: 'smile', title: 'PDN Pals', body: 'Cultural hosts who make you feel at home.' },
        ],
      },
      { type: 'cta', heading: 'Want to work with us?', body: 'Guides, partners and suppliers who share our values are always welcome.', buttonLabel: 'Get in touch', buttonLink: '/contact' },
    ],
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    eyebrow: 'Support',
    subtitle: 'Please read these terms carefully before using our website or booking a journey.',
    heroImage: '',
    navGroup: 'support',
    sortOrder: 4,
    metaDescription: 'Terms and conditions for using the PDN Travel website and booking trips.',
    sections: [
      { type: 'richText', body: 'Last updated: September 2026. By using pdntravel.com or booking with Peace Destination Nepal Pvt. Ltd. (“PDN”, “we”, “us”) you agree to the terms below.' },
      {
        type: 'legal',
        items: [
          { title: 'Using this website', body: 'You must be at least 18 years old, or the age of legal majority where you live, to use this website and make bookings. Use the site only for lawful purposes. We work hard to keep information accurate but cannot guarantee that every detail is complete or current.' },
          { title: 'Bookings and reservations', body: 'Please give accurate information when you enquire or book. A booking is confirmed only when we send written confirmation. Prices may change until your booking is confirmed.' },
          { title: 'Payments and pricing', body: 'Payment schedules, deposits and accepted methods are shared in writing before you pay. Unless stated otherwise, prices are per person in US dollars and exclude international flights, visas and travel insurance.' },
          { title: 'Changes, cancellations and refunds', body: 'Each service may have its own cancellation and refund rules, which we explain before you confirm. Mountain travel can be affected by weather and flight delays; your guide may adjust the route for safety.' },
          { title: 'Your account', body: 'If you create an account you are responsible for keeping your login details confidential and for activity under your account. Tell us straight away if you suspect unauthorised access. We may suspend accounts involved in fraud or misuse.' },
          { title: 'Travel documents and health', body: 'You are responsible for valid passports, visas, permits and any required vaccinations. Tell us about medical conditions that could affect your trip, and carry insurance covering the activities and altitudes on your itinerary.' },
          { title: 'Intellectual property', body: 'All website content — text, images, graphics, logos and trademarks — belongs to PDN or its licensors. Please do not copy or distribute it without our written permission.' },
          { title: 'Third-party websites', body: 'Links to other websites are provided for convenience. We are not responsible for their content or practices, and you visit them at your own risk.' },
          { title: 'Limitation of liability', body: 'To the extent permitted by law, PDN is not liable for indirect, incidental or consequential losses, or for losses caused by independent suppliers such as airlines and hotels.' },
          { title: 'Privacy', body: 'Our Privacy Policy explains how we collect and use personal information. By using the site you agree to those practices.' },
          { title: 'Changes to these terms', body: 'We may update these terms from time to time. The latest version will always be on this page, and continued use of the website means you accept it.' },
          { title: 'Contact', body: 'Questions about these terms? Email contact@pdntravel.com or call +971 50 717 1487.' },
        ],
      },
    ],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    eyebrow: 'Support',
    subtitle: 'How we collect, use and protect your personal information.',
    heroImage: '',
    navGroup: null,
    sortOrder: 5,
    metaDescription: 'How PDN Travel collects, uses and protects your personal information.',
    sections: [
      { type: 'richText', body: 'Last updated: September 2026. Your trust matters to us. This policy explains what we collect and why.' },
      {
        type: 'legal',
        items: [
          { title: 'Information we collect', body: 'Details you give us when you enquire or book — such as your name, email, phone number, passport details and preferences — plus basic technical data about how you use our website.' },
          { title: 'How we use it', body: 'To arrange and manage your trip, keep you updated, personalise recommendations, send optional newsletters (you can unsubscribe at any time) and improve our services.' },
          { title: 'Security and storage', body: 'We use encryption, access controls and secure systems to protect your information, and keep it only for as long as we need it.' },
          { title: 'Sharing', body: 'We share information only with trusted providers needed to deliver your trip, such as airlines, hotels and permit offices. We never sell your personal data.' },
          { title: 'Cookies', body: 'Cookies are small files that remember preferences like your language and theme. You can control cookies in your browser settings.' },
          { title: 'Children', body: 'We do not knowingly collect personal information from children under 16 without a parent or guardian.' },
          { title: 'Third-party websites', body: 'This policy covers our website only. Other sites we link to have their own privacy practices.' },
          { title: 'Changes to this policy', body: 'We will post any updates on this page. Continued use of our website means you accept the updated policy.' },
        ],
      },
    ],
  },
  {
    slug: 'pdn-appeal',
    title: 'Love, Protection & Peace',
    eyebrow: 'PDN Appeal',
    subtitle: 'Travel can be a force for good. Our appeal asks every traveller to help protect the planet and its people.',
    heroImage: u('1592623171049-4be9e0f5a501', 2000),
    navGroup: 'support',
    sortOrder: 6,
    metaDescription: 'The PDN Appeal — our commitment to sustainable tourism, education and peace.',
    sections: [
      {
        type: 'richText',
        heading: 'Why we speak up',
        body: 'Deforestation, fossil fuels, pollution, plastic waste and conflict threaten the landscapes and communities travellers love. Inequality and a lack of education hold too many people back.\n\nThe PDN Appeal is our promise — and our invitation to you — to choose kinder ways of exploring the world.',
      },
      {
        type: 'cards',
        heading: 'Three pillars',
        items: [
          { icon: 'heart', title: 'Love', body: 'Empathy for every living being — people, animals and the natural world.' },
          { icon: 'shield-check', title: 'Protection', body: 'Practical, sustainable choices that keep destinations clean and green.' },
          { icon: 'bird', title: 'Peace', body: 'Dialogue and cooperation over conflict, at home and around the world.' },
        ],
      },
      {
        type: 'list',
        heading: 'What we are working towards',
        items: [
          'Sustainable tourism and eco-tourism models that benefit local communities',
          'Education for every child and food security for every family',
          'Support and inclusion for differently-abled people',
          'Electric and local transport wherever possible',
          'Circular-economy practices and an end to single-use plastic',
          'Peaceful dialogue and coexistence between people and nature',
        ],
      },
      { type: 'quote', text: 'Protect the Earth: keep it clean, green and full of love.', attribution: 'The PDN Appeal' },
      { type: 'cta', heading: 'Join the appeal', body: 'Volunteer, partner with us or add a community project to your trip.', buttonLabel: 'Get involved', buttonLink: '/contact' },
    ],
  },
  {
    slug: 'pdn-events',
    title: 'PDN Events',
    eyebrow: 'Support',
    subtitle: 'Launches, celebrations and community gatherings from the PDN family.',
    heroImage: u('1699202700754-1e5cbf0f8660', 2000),
    navGroup: 'support',
    sortOrder: 7,
    metaDescription: 'Upcoming PDN Travel events, including our World Tourism Day 2026 grand opening.',
    sections: [
      {
        type: 'events',
        heading: 'Upcoming',
        items: [
          {
            title: 'World Tourism Day 2026 — PDN Grand Opening',
            date: '2026-09-27',
            location: 'Kathmandu, Nepal',
            body: 'Celebrate the official launch of Peace Destination Nepal with our team, partners and friends. Expect cultural performances, travel talks and a first look at our 2027 journeys.',
            image: u('1618851142562-ff30d09313a9', 1200),
            ctaLabel: 'Reserve my spot',
            ctaLink: '/contact?topic=World%20Tourism%20Day%202026',
          },
        ],
      },
      { type: 'richText', heading: 'More coming soon', body: 'New events are added here as they are announced. Subscribe to our newsletter to hear first.' },
    ],
  },
];
