const photos = [
  {
    number: '01',
    title: 'Rail Inspection Trolley',
    category: 'Field Equipment',
    description:
      'On-site view of the rail inspection trolley and the equipment arranged for track testing.',
    src: '/images/rail-inspection-trolley.jpeg',
    alt: 'Yellow rail inspection trolley with inspection equipment at the railway site',
  },
  {
    number: '02',
    title: 'USFD Workstation',
    category: 'Inspection & Analysis',
    description:
      'Inspection team reviewing ultrasonic flaw detector readings and working with the analysis system.',
    src: '/images/usfd-workstation.jpeg',
    alt: 'Team reviewing an ultrasonic flaw detector and laptop at a workstation',
  },
  {
    number: '03',
    title: 'On-site Ultrasonic Testing',
    category: 'Field Testing',
    description:
      'Technicians carrying out practical ultrasonic testing and examining the inspection instrument.',
    src: '/images/on-site-ultrasonic-testing.jpeg',
    alt: 'Technicians gathered around ultrasonic testing equipment during a field inspection',
  },
];

export default function FieldGallery() {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
            <span className="h-px w-7 bg-emerald-400" /> RailScan / Field Documentation
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-emerald-50 sm:text-3xl">
            Inspection Gallery
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/55">
            A visual record of the rail inspection equipment, ultrasonic testing setup,
            and on-site inspection activities.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg border border-emerald-800/70 bg-emerald-950/50 px-3 py-2 text-xs text-emerald-200/75">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          3 field photographs
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => (
          <article
            key={photo.number}
            className="group overflow-hidden rounded-2xl border border-emerald-900/70 bg-[#071b16] shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-emerald-600/70"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#0b251d]">
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
              />
              <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/55 px-2 py-1 text-[10px] font-mono tracking-wider text-white backdrop-blur-sm">
                {photo.number} / 03
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80">
                {photo.category}
              </div>
              <h2 className="text-base font-semibold text-emerald-50">{photo.title}</h2>
              <p className="mt-2 text-xs leading-5 text-emerald-100/55">{photo.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-emerald-100/55">
          Field photographs supplied for the RailScan UT project documentation.
        </p>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-400/70">
          RailScan UT · Inspection & Reporting
        </span>
      </div>
    </main>
  );
}
