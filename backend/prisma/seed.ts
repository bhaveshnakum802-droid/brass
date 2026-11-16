import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if database is already seeded to avoid resetting settings/content and creating duplicates on restarts
  const adminCount = await prisma.adminUser.count();
  if (adminCount > 0) {
    console.log('📊 Database is already seeded. Skipping seeding to preserve your custom settings and products.');
    return;
  }

  console.log('🌱 Seeding database...\n');

  // ── Admin User ──────────────────────────────────────────────
  const defaultAdminEmail = process.env.ADMIN_EMAIL || 'bhaveshnakum802@gmail.com';
  const defaultAdminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(defaultAdminPass, 12);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: { email: defaultAdminEmail },
    create: {
      username: 'admin',
      email: defaultAdminEmail,
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    },
  });
  console.log(`✅ Admin user: admin (${defaultAdminEmail})`);

  // ── Categories ────────────────────────────────────────────
  const cats = [
    { name: 'Heavy Machinery', slug: 'heavy-machinery', description: 'Industrial-grade heavy machinery for large-scale manufacturing operations.', order: 1 },
    { name: 'Precision Parts', slug: 'precision-parts', description: 'High-precision engineered components manufactured to exact tolerances.', order: 2 },
    { name: 'Industrial Tools', slug: 'industrial-tools', description: 'Professional-grade tools designed for heavy industrial use.', order: 3 },
    { name: 'Safety Equipment', slug: 'safety-equipment', description: 'Certified safety equipment meeting international standards.', order: 4 },
    { name: 'Hydraulic Systems', slug: 'hydraulic-systems', description: 'Advanced hydraulic solutions for industrial and mobile applications.', order: 5 },
  ];
  const catMap: Record<string, string> = {};
  for (const c of cats) {
    const cat = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, isActive: true } });
    catMap[c.slug] = cat.id;
    console.log('✅ Category:', c.name);
  }

  // ── Products ─────────────────────────────────────────────
  const products = [
    {
      name: 'Industrial CNC Milling Machine XL-5000', slug: 'cnc-milling-machine-xl5000', sku: 'CNC-XL-5000', catSlug: 'heavy-machinery', featured: true, status: 'ACTIVE' as const,
      shortDesc: 'High-performance 5-axis CNC milling machine for complex precision manufacturing.',
      fullDesc: 'The XL-5000 CNC Milling Machine represents the pinnacle of modern manufacturing technology. Designed for high-volume production environments, it delivers exceptional accuracy and reliability with a rigid cast iron frame and premium linear guides.',
      features: ['5-axis simultaneous machining', 'High-speed spindle: 12,000 RPM', 'Automatic tool changer with 24 tool capacity', 'Advanced CNC touchscreen control', 'Integrated coolant and chip removal', 'IoT remote monitoring'],
      specs: [{ label: 'Axes', value: '5-Axis' }, { label: 'Table Size', value: '1200 × 600 mm' }, { label: 'Max Spindle Speed', value: '12,000 RPM' }, { label: 'Accuracy', value: '±0.005 mm' }, { label: 'Tool Capacity', value: '24 tools' }, { label: 'Weight', value: '8,500 kg' }],
    },
    {
      name: 'Hydraulic Press HP-200T', slug: 'hydraulic-press-hp200t', sku: 'HP-200T', catSlug: 'heavy-machinery', featured: true, status: 'ACTIVE' as const,
      shortDesc: '200-ton hydraulic press for heavy-duty forming and stamping operations.',
      fullDesc: 'The HP-200T Hydraulic Press is engineered for demanding forming, stamping, and assembly operations in automotive, aerospace, and heavy manufacturing.',
      features: ['200-ton maximum pressing force', 'Adjustable speed and force control', 'Digital pressure monitoring', 'Safety interlocks and E-stop', 'Robust welded steel frame', 'Quick die change system'],
      specs: [{ label: 'Max Force', value: '200 Tons' }, { label: 'Stroke', value: '500 mm' }, { label: 'Daylight', value: '800 mm' }, { label: 'Table Size', value: '900 × 700 mm' }, { label: 'Motor Power', value: '22 kW' }],
    },
    {
      name: 'Precision Ball Bearing PB-6200', slug: 'precision-ball-bearing-pb6200', sku: 'PB-6200', catSlug: 'precision-parts', featured: true, status: 'ACTIVE' as const,
      shortDesc: 'ABEC-7 precision deep groove ball bearings for high-speed applications.',
      fullDesc: 'Manufactured to ABEC-7 standards, the PB-6200 delivers exceptional performance in high-speed and high-precision applications with chrome or stainless steel options.',
      features: ['ABEC-7 precision class', 'Chrome or stainless steel options', 'Sealed or open configurations', 'Rated up to 20,000 RPM', 'Low noise and vibration', 'ISO 492 certified'],
      specs: [{ label: 'Bore Diameter', value: '20 mm' }, { label: 'Outer Diameter', value: '47 mm' }, { label: 'Width', value: '14 mm' }, { label: 'Load Rating', value: '15.9 kN' }, { label: 'Max Speed', value: '20,000 RPM' }, { label: 'Grade', value: 'ABEC-7' }],
    },
    {
      name: 'Hydraulic Cylinder HC-150', slug: 'hydraulic-cylinder-hc150', sku: 'HC-150', catSlug: 'hydraulic-systems', featured: true, status: 'ACTIVE' as const,
      shortDesc: 'Heavy-duty double-acting hydraulic cylinder with 150mm bore.',
      fullDesc: 'Engineered for long service life and reliable performance in industrial machinery, mobile equipment, and automation systems. Custom stroke lengths available.',
      features: ['Double-acting push and pull force', 'Hardened chrome-plated piston rod', 'PTFE-coated seals for low friction', 'Multiple mounting options', 'Suitable for mineral and bio-degradable oils', 'Custom stroke lengths'],
      specs: [{ label: 'Bore Diameter', value: '150 mm' }, { label: 'Rod Diameter', value: '90 mm' }, { label: 'Max Pressure', value: '250 bar' }, { label: 'Stroke Range', value: '100–2000 mm' }, { label: 'Temp Range', value: '-20°C to +80°C' }],
    },
    {
      name: 'Industrial Impact Wrench IW-1800', slug: 'industrial-impact-wrench-iw1800', sku: 'IW-1800', catSlug: 'industrial-tools', featured: false, status: 'ACTIVE' as const,
      shortDesc: 'Heavy-duty pneumatic impact wrench delivering 1,800 Nm of torque.',
      fullDesc: 'The IW-1800 is designed for demanding fastening applications in automotive, heavy equipment, and industrial maintenance environments.',
      features: ['1,800 Nm max torque', 'Twin-hammer mechanism', '4-setting torque control', 'Ergonomic vibration-dampening grip', 'Built-in LED work light', 'Composite housing'],
      specs: [{ label: 'Max Torque', value: '1,800 Nm' }, { label: 'Air Flow', value: '7.5 CFM' }, { label: 'Free Speed', value: '7,000 RPM' }, { label: 'Drive', value: '1 inch' }, { label: 'Weight', value: '4.2 kg' }],
    },
    {
      name: 'Safety Helmet Pro SH-900', slug: 'safety-helmet-pro-sh900', sku: 'SH-900', catSlug: 'safety-equipment', featured: false, status: 'ACTIVE' as const,
      shortDesc: 'EN 397 certified industrial safety helmet with advanced impact protection.',
      fullDesc: 'The SH-900 meets EN 397 and ANSI Z89.1 standards with an ABS outer shell, ratchet adjustment, and accessory slots for visor and earmuffs.',
      features: ['EN 397 / ANSI Z89.1 certified', 'ABS shell with foam liner', 'Ratchet fit system 51–63 cm', 'Ventilated design', 'Visor and earmuff accessory slots', '6 available colors'],
      specs: [{ label: 'Standard', value: 'EN 397 / ANSI Z89.1' }, { label: 'Material', value: 'ABS Plastic' }, { label: 'Weight', value: '380 g' }, { label: 'Size', value: '51–63 cm' }, { label: 'Temp Range', value: '-30°C to +70°C' }],
    },
    {
      name: 'Hydraulic Power Unit HPU-37', slug: 'hydraulic-power-unit-hpu37', sku: 'HPU-37', catSlug: 'hydraulic-systems', featured: false, status: 'ACTIVE' as const,
      shortDesc: 'Compact 37kW hydraulic power unit for industrial machinery.',
      fullDesc: 'The HPU-37 provides reliable hydraulic power for presses, lifts, and automated systems. Engineered for continuous duty with PLC-ready controls.',
      features: ['37 kW electric motor', 'Variable displacement piston pump', 'Built-in pressure and flow control', 'Oil temperature monitoring', 'Stainless steel reservoir', 'PLC-ready interface'],
      specs: [{ label: 'Motor Power', value: '37 kW / 50 HP' }, { label: 'Max Pressure', value: '280 bar' }, { label: 'Max Flow', value: '80 L/min' }, { label: 'Reservoir', value: '200 L' }, { label: 'Voltage', value: '380V 3-Phase 50Hz' }],
    },
    {
      name: 'Digital Torque Wrench TW-1000', slug: 'digital-torque-wrench-tw1000', sku: 'TW-1000', catSlug: 'industrial-tools', featured: false, status: 'ACTIVE' as const,
      shortDesc: 'Precision digital torque wrench with 1000 Nm capacity and USB data output.',
      fullDesc: 'Delivers accurate, repeatable torque measurements for critical fastening in manufacturing and maintenance. Memory storage for 9 preset values and USB data logging.',
      features: ['±0.5% accuracy', '100–1000 Nm range', 'Audible and visual torque alert', '9 preset memory slots', 'USB data output', 'Ratcheting head'],
      specs: [{ label: 'Range', value: '100–1000 Nm' }, { label: 'Accuracy', value: '±0.5%' }, { label: 'Resolution', value: '0.1 Nm' }, { label: 'Drive', value: '3/4 inch' }, { label: 'Display', value: 'LCD backlit' }],
    },
    {
      name: 'Precision Gear Set PG-450', slug: 'precision-gear-set-pg450', sku: 'PG-450', catSlug: 'precision-parts', featured: false, status: 'ACTIVE' as const,
      shortDesc: 'DIN 5 quality ground helical gears for smooth, quiet power transmission.',
      fullDesc: 'Case-hardened helical gears ground to DIN 5 quality, providing excellent load capacity, minimal noise, and long service life.',
      features: ['DIN 5 quality ground', 'Case-hardened alloy steel', 'Helical tooth profile', 'Multiple gear ratios', 'Low backlash design', 'Extended service life'],
      specs: [{ label: 'Module', value: '4' }, { label: 'Grade', value: 'DIN 5' }, { label: 'Material', value: '20MnCr5 Steel' }, { label: 'Hardness', value: '58–62 HRC' }, { label: 'Helix Angle', value: '15°' }],
    },
    {
      name: 'Full Body Safety Harness FH-1000', slug: 'full-body-safety-harness-fh1000', sku: 'FH-1000', catSlug: 'safety-equipment', featured: false, status: 'ACTIVE' as const,
      shortDesc: 'EN 361 certified full body harness for work-at-height applications.',
      fullDesc: 'Designed for comfort and reliability in construction, maintenance, and industrial work-at-height situations. Universal size with padded shoulder and leg straps.',
      features: ['EN 361 / ANSI Z359.11 certified', 'Quick-connect chest and leg buckles', 'Dorsal and sternal attachment points', 'Padded straps', 'Universal fit', 'Hi-vis reflective strips'],
      specs: [{ label: 'Standard', value: 'EN 361 / ANSI Z359.11' }, { label: 'Weight Limit', value: '140 kg' }, { label: 'Webbing', value: 'Polyester' }, { label: 'Buckles', value: 'Aluminum alloy' }, { label: 'Size', value: 'Universal' }],
    },
  ];

  for (const p of products) {
    const { catSlug, features, specs, ...fields } = p;
    await prisma.product.upsert({
      where: { slug: fields.slug },
      update: {},
      create: { ...fields, categoryId: catMap[catSlug], features: { create: features.map((f, i) => ({ feature: f, order: i })) }, specs: { create: specs.map((s, i) => ({ ...s, order: i })) } },
    });
    console.log('✅ Product:', fields.name);
  }

  // ── Testimonials ─────────────────────────────────────────
  const testimonials = [
    { name: 'Rajesh Kumar', role: 'Plant Manager', company: 'AutoTech Manufacturing Ltd.', rating: 5, content: 'The quality and reliability exceeded our expectations. The CNC machines have been running 24/7 for 18 months without a major issue. Exceptional engineering and outstanding service.', order: 1 },
    { name: 'Priya Sharma', role: 'Procurement Director', company: 'Bharat Heavy Industrials', rating: 5, content: 'We have been sourcing precision parts and hydraulic systems for over 5 years. The consistency, quality, and on-time delivery are unmatched. A truly reliable industrial partner.', order: 2 },
    { name: 'Arjun Mehta', role: 'Head of Operations', company: 'Pacific Steel Works', rating: 5, content: 'The technical support team is outstanding. When we needed custom hydraulic cylinders, they designed and delivered exactly what we needed — ahead of schedule.', order: 3 },
    { name: 'Sunita Reddy', role: 'Safety Manager', company: 'Infra Build Corporation', rating: 5, content: 'Safety equipment certified to the highest international standards. Our team feels confident using these products on site every day. Highly recommend.', order: 4 },
  ];
  for (const t of testimonials) {
    try { await prisma.testimonial.create({ data: { ...t, isActive: true } }); console.log('✅ Testimonial:', t.name); }
    catch { /* skip duplicates */ }
  }

  // ── Services ─────────────────────────────────────────────
  const services = [
    { title: 'Custom Manufacturing', description: 'Tailored manufacturing solutions designed to your exact specifications and tolerances. We work closely with your engineering team.', icon: 'Settings', order: 1 },
    { title: 'Technical Consultation', description: 'Expert engineering consultation to help you select the right equipment and components for your specific application and budget.', icon: 'MessageSquare', order: 2 },
    { title: 'After-Sales Support', description: 'Comprehensive after-sales service including installation, maintenance, spare parts supply, and on-site technical support.', icon: 'Wrench', order: 3 },
    { title: 'Quality Inspection', description: 'Third-party certified quality inspection and testing ensuring all products meet international standards before delivery.', icon: 'ShieldCheck', order: 4 },
    { title: 'Bulk Supply Programs', description: 'Reliable bulk supply with guaranteed inventory levels, scheduled delivery, and competitive volume pricing.', icon: 'Package', order: 5 },
    { title: 'Express Delivery', description: 'Priority manufacturing and express delivery options for urgent requirements, minimizing your downtime.', icon: 'Zap', order: 6 },
  ];
  for (const s of services) {
    try { await prisma.service.create({ data: { ...s, isActive: true } }); console.log('✅ Service:', s.title); }
    catch { /* skip duplicates */ }
  }

  // ── Site Settings ─────────────────────────────────────────
  const settings: { key: string; value: string; group: string; label: string }[] = [
    { key: 'site_name', value: '[Client Name] Industries', group: 'general', label: 'Site Name' },
    { key: 'site_tagline', value: 'Precision. Quality. Reliability.', group: 'general', label: 'Tagline' },
    { key: 'site_description', value: 'Leading manufacturer and supplier of industrial machinery, precision parts, and safety equipment trusted by businesses across India.', group: 'general', label: 'Site Description' },
    { key: 'hero_heading', value: 'Engineering Excellence for Industrial India', group: 'hero', label: 'Hero Heading' },
    { key: 'hero_subheading', value: 'Premium industrial machinery, precision parts, and safety equipment trusted by leading manufacturers.', group: 'hero', label: 'Hero Subheading' },
    { key: 'hero_cta_primary', value: 'Explore Products', group: 'hero', label: 'Primary CTA' },
    { key: 'hero_cta_secondary', value: 'Contact Us', group: 'hero', label: 'Secondary CTA' },
    { key: 'about_heading', value: 'Built on a Foundation of Engineering Excellence', group: 'about', label: 'About Heading' },
    { key: 'about_content', value: 'With over 20 years of experience in the industrial manufacturing sector, we have established ourselves as a trusted partner for businesses across India.\n\nWe specialize in heavy machinery, precision engineered components, industrial tools, safety equipment, and hydraulic systems — all meeting rigorous quality standards and international certifications.', group: 'about', label: 'About Content' },
    { key: 'about_years_experience', value: '20+', group: 'about', label: 'Years of Experience' },
    { key: 'about_products_count', value: '500+', group: 'about', label: 'Products Count' },
    { key: 'about_clients_count', value: '1,000+', group: 'about', label: 'Clients Count' },
    { key: 'about_states_count', value: '28', group: 'about', label: 'States Served' },
    { key: 'contact_address', value: '123 Industrial Area, Phase II\nNew Delhi, 110020\nIndia', group: 'contact', label: 'Address' },
    { key: 'contact_phone', value: '+91 98765 43210', group: 'contact', label: 'Phone' },
    { key: 'contact_phone_alt', value: '+91 11 4567 8900', group: 'contact', label: 'Alt Phone' },
    { key: 'whatsapp_number', value: '919924464511', group: 'contact', label: 'WhatsApp Number' },
    { key: 'contact_email', value: 'info@example.com', group: 'contact', label: 'Email' },
    { key: 'contact_email_support', value: 'support@example.com', group: 'contact', label: 'Support Email' },
    { key: 'contact_hours', value: 'Monday – Saturday: 9:00 AM – 6:00 PM\nSunday: Closed', group: 'contact', label: 'Business Hours' },
    { key: 'social_linkedin', value: '', group: 'social', label: 'LinkedIn URL' },
    { key: 'social_facebook', value: '', group: 'social', label: 'Facebook URL' },
    { key: 'social_instagram', value: '', group: 'social', label: 'Instagram URL' },
    { key: 'social_youtube', value: '', group: 'social', label: 'YouTube URL' },
    { key: 'cta_heading', value: 'Looking for Reliable Industrial Equipment?', group: 'cta', label: 'CTA Heading' },
    { key: 'cta_subheading', value: 'Contact our team today for expert guidance on the right products for your industrial needs.', group: 'cta', label: 'CTA Subheading' },
    { key: 'cta_button_text', value: 'Get In Touch', group: 'cta', label: 'CTA Button Text' },
    { key: 'meta_title', value: '[Client Name] Industries — Premium Industrial Equipment', group: 'seo', label: 'Meta Title' },
    { key: 'meta_description', value: 'Leading supplier of industrial machinery, precision parts, safety equipment, and hydraulic systems in India. 20+ years experience. Trusted by 1000+ clients.', group: 'seo', label: 'Meta Description' },
  ];
  for (const s of settings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log('✅ Site settings seeded');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📋 Admin credentials → username: admin  |  password: admin123');
  console.log('⚠️  Change the admin password after first login!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
