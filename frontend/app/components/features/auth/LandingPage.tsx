'use client'

import Link from 'next/link'
import { ChatBubbleLeftRightIcon, ShieldCheckIcon, SparklesIcon, UserGroupIcon } from '@heroicons/react/24/outline'

const highlights = [
  {
    title: 'Drošas sarunas',
    description: 'Sazinies ar komandu un draugiem vienuviet, ar modernu un saprotamu interfeisu.',
    icon: ShieldCheckIcon
  },
  {
    title: 'Ikdienas diskusijas',
    description: 'Publicē domas, seko tēmām un atklāj idejas no citiem lietotājiem.',
    icon: SparklesIcon
  },
  {
    title: 'Kopienas sajūta',
    description: 'Veido grupas, iesaisti citus un uzturi kvalitatīvu sarunu kultūru.',
    icon: UserGroupIcon
  }
]

export default function LandingPage() {
  return (
    <div className="bg-surface">
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border-ui bg-surface-2 px-4 py-2 text-sm text-ink-muted">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-accent" />
                DomuGrauds platforma sarunām
              </div>
              <h1 className="mt-6 text-4xl font-bold text-ink sm:text-5xl">
                Vieta, kur idejas kļūst par vērtīgām sarunām
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-muted">
                DomuGrauds palīdz komandām un kopienām uzturēt kvalitatīvas diskusijas, dalīties ar jaunām domām un ātri sasniegt īstos cilvēkus.
              </p>
              <p className="mt-4 max-w-xl text-base text-ink-muted">
                Neatkarīgi no tā, vai veidojat mācību grupu, komandas vidi vai interešu kopienu, platforma palīdz sarunas organizēt skaidri, draudzīgi un ar ilgtermiņa vērtību.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className="rounded-xl bg-accent px-6 py-3 font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                >
                  Sākt tagad
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-ink">Kāpēc izvēlēties DomuGrauds?</h2>
              <ul className="mt-6 space-y-4">
                {highlights.map((item) => {
                  const Icon = item.icon

                  return (
                    <li key={item.title} className="flex gap-4 rounded-xl border border-border-ui/70 bg-surface p-4">
                      <Icon className="mt-0.5 h-5 w-5 text-accent" />
                      <div>
                        <h3 className="font-medium text-ink">{item.title}</h3>
                        <p className="mt-1 text-sm text-ink-muted">{item.description}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="iespejas" className="border-y border-border-ui/70 bg-surface-2/70 px-4 py-14">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border-ui bg-surface p-5">
            <p className="text-sm font-semibold text-accent">01</p>
            <h3 className="mt-2 font-semibold text-ink">Publiskās un privātās tēmas</h3>
            <p className="mt-2 text-sm text-ink-muted">Veido diskusijas, kas piemērotas gan plašākai auditorijai, gan slēgtai komandai.</p>
          </div>
          <div className="rounded-xl border border-border-ui bg-surface p-5">
            <p className="text-sm font-semibold text-accent">02</p>
            <h3 className="mt-2 font-semibold text-ink">Ātri paziņojumi</h3>
            <p className="mt-2 text-sm text-ink-muted">Saņem aktuālos paziņojumus reāllaikā un nepalaid garām svarīgāko.</p>
          </div>
          <div className="rounded-xl border border-border-ui bg-surface p-5">
            <p className="text-sm font-semibold text-accent">03</p>
            <h3 className="mt-2 font-semibold text-ink">Vienkārša piekļuve</h3>
            <p className="mt-2 text-sm text-ink-muted">Pieslēdzies, izveido kontu un sāc sarunas bez liekām darbībām.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-ink">Ko iegūsi, pievienojoties jau šodien?</h2>
            <p className="mt-3 text-ink-muted">
              DomuGrauds nav tikai vēl viens čats. Tā ir vieta strukturētām sarunām, kur idejas nepazūd, bet attīstās no diskusijas uz diskusiju.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-ink-muted">
              <li className="rounded-lg border border-border-ui bg-surface px-4 py-3">Skaidri pārskatāmas tēmas, lai saturs vienmēr ir atrodams.</li>
              <li className="rounded-lg border border-border-ui bg-surface px-4 py-3">Tiešās ziņas ātrai komunikācijai bez informācijas pārslodzes.</li>
              <li className="rounded-lg border border-border-ui bg-surface px-4 py-3">Draudzīga vide kopienām, kur svarīga kvalitāte un cieņpilna diskusija.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border-ui bg-surface-2 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-ink">Gatavs sākt?</h2>
            <p className="mt-3 text-ink-muted">
              Izveido kontu dažu sekunžu laikā un sāc veidot sarunas, kas piesaista cilvēkus un rada vērtību tavai kopienai.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth"
                className="rounded-xl bg-accent px-6 py-3 font-medium text-accent-fg transition-colors hover:bg-accent-hover"
              >
                Reģistrēties / Pieslēgties
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
