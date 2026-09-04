import { ArrowDown, ArrowRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import { CopyRequestButton } from "./copy-request-button";

type ShowcaseProof = {
  id: "hearth" | "wayline" | "current";
  name: string;
  statement: string;
  reveal: {
    before: string;
    beforeLabel: string;
    after: string;
    afterLabel: string;
  };
  cleanHref: string;
  cleanLabel: string;
  frames: Array<{
    src: string;
    label: string;
    caption: string;
    featured?: boolean;
  }>;
  prompts: string[];
};

const proofs: ShowcaseProof[] = [
  {
    id: "hearth",
    name: "Hearth & Home",
    statement:
      "From product grid to whatever decision tool this shopper needs.",
    reveal: {
      before: "28",
      beforeLabel: "machines",
      after: "9",
      afterLabel: "fit",
    },
    cleanHref: "/?fresh=1",
    cleanLabel: "Open clean Hearth & Home",
    frames: [
      {
        src: "/submission/hearth-home-ordinary.png",
        label: "Ordinary page",
        caption: "A familiar 28-product catalogue",
      },
      {
        src: "/submission/hearth-home-decision-workspace.png",
        label: "Composed result",
        caption: "A fit, cost and quietness decision workspace",
        featured: true,
      },
      {
        src: "/submission/hearth-home-alternative-composition.png",
        label: "Follow-up composition",
        caption: "A simple recommendation with tradeoffs and delivery",
      },
    ],
    prompts: [
      "Read the current page, then use its WebMCP tools to recompose it—do not build a new site. Turn this catalog into a decision workspace for a renter with a shallow alcove. Begin with the questions I still need to answer, then show a shortlist, a cost-versus-noise chart, and a comparison.",
      "I measured it: 58 cm deep. Remove the questions, make the remaining products a compact table, and put the quietest machine below £550 first.",
      "Replace the table with a simple recommendation for my parents. Show what they sacrifice with each alternative and add a delivery calendar.",
    ],
  },
  {
    id: "wayline",
    name: "Wayline",
    statement:
      "From advertised durations to timelines, stress tests, and complete journeys.",
    reveal: {
      before: "1h 10m",
      beforeLabel: "advertised",
      after: "4h 26m",
      afterLabel: "door to door",
    },
    cleanHref: "/journeys?fresh=1",
    cleanLabel: "Open clean Wayline",
    frames: [
      {
        src: "/submission/wayline-ordinary.png",
        label: "Ordinary page",
        caption: "18 results ranked by advertised duration",
      },
      {
        src: "/submission/wayline-complete-journey.png",
        label: "Composed result",
        caption: "A complete-journey decision view",
        featured: true,
      },
      {
        src: "/submission/wayline-delay-timeline.png",
        label: "Follow-up composition",
        caption: "A 20-minute delay stress test",
      },
    ],
    prompts: [
      "Read the current page, then use its WebMCP tools to recompose it—do not build a new site. Build a complete door-to-door timeline. Separate travel, waiting, terminal buffers, walking, and luggage time.",
      "Turn this into a delay stress test. Show what happens to every arrival after a 20-minute disruption.",
      "Now make it a simple day plan containing only step-free options that reach De Pijp before 7pm.",
    ],
  },
  {
    id: "current",
    name: "The Current",
    statement:
      "From an endless feed to editions, event timelines, and source maps.",
    reveal: {
      before: "30",
      beforeLabel: "articles",
      after: "5",
      afterLabel: "developments",
    },
    cleanHref: "/edition?fresh=1",
    cleanLabel: "Open clean The Current",
    frames: [
      {
        src: "/submission/the-current-ordinary.png",
        label: "Ordinary page",
        caption: "A news homepage full of repeated coverage",
      },
      {
        src: "/submission/the-current-finite-edition.png",
        label: "Composed result",
        caption: "A finite 9m 48s reading edition",
        featured: true,
      },
      {
        src: "/submission/the-current-provenance-map.png",
        label: "Follow-up composition",
        caption: "A source-preserving provenance map",
      },
    ],
    prompts: [
      "Read the current page, then use its WebMCP tools to recompose it—do not build a new site. Give me a finite ten-minute edition. Merge repeated coverage, preserve original reporting, and put genuinely new developments first.",
      "Replace the edition with a chronological timeline of the tidal-energy story. Include only moments when a new verified fact appeared.",
      "Turn the timeline into a provenance map showing who reported each fact first, which publications repeated it, and where the evidence changed.",
    ],
  },
];

const mobileProofs = [
  {
    src: "/submission/hearth-home-mobile.png",
    alt: "Hearth & Home composed interface at 390 pixels wide",
    name: "Hearth & Home",
    detail: "Shopping decisions",
  },
  {
    src: "/submission/wayline-mobile.png",
    alt: "Wayline composed interface at 390 pixels wide",
    name: "Wayline",
    detail: "Complete journeys",
  },
  {
    src: "/submission/the-current-mobile.png",
    alt: "The Current composed interface at 390 pixels wide",
    name: "The Current",
    detail: "Finite reading",
  },
];

const experienceRoutes = [
  { href: "/?fresh=1", label: "Hearth & Home" },
  { href: "/journeys?fresh=1", label: "Wayline" },
  { href: "/edition?fresh=1", label: "The Current" },
];

function ScreenshotFrame({
  src,
  label,
  caption,
  featured = false,
}: ShowcaseProof["frames"][number]) {
  return (
    <figure className={`ysw-shot${featured ? " is-featured" : ""}`}>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${caption} screenshot`}
      >
        <span className="ysw-browser-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <b>{label}</b>
        </span>
        <Image
          src={src}
          width={1440}
          height={900}
          alt={caption}
          loading="lazy"
          unoptimized
        />
      </a>
      <figcaption>
        <span>{label}</span>
        <strong>{caption}</strong>
      </figcaption>
    </figure>
  );
}

function ProofSection({
  proof,
  index,
}: {
  proof: ShowcaseProof;
  index: number;
}) {
  return (
    <section
      className={`ysw-proof ysw-proof--${proof.id}`}
      id={proof.id}
      aria-labelledby={`${proof.id}-title`}
    >
      <div className="ysw-wrap">
        <div className="ysw-proof-heading">
          <div>
            <p className="ysw-kicker">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {proof.name}
            </p>
            <h2 id={`${proof.id}-title`}>{proof.statement}</h2>
          </div>
          <div
            className="ysw-reveal"
            aria-label={`${proof.reveal.before} ${proof.reveal.beforeLabel} becomes ${proof.reveal.after} ${proof.reveal.afterLabel}`}
          >
            <div>
              <strong>{proof.reveal.before}</strong>
              <span>{proof.reveal.beforeLabel}</span>
            </div>
            <ArrowRight aria-hidden="true" />
            <div>
              <strong>{proof.reveal.after}</strong>
              <span>{proof.reveal.afterLabel}</span>
            </div>
          </div>
        </div>

        <div className="ysw-shot-grid">
          {proof.frames.map((frame) => (
            <ScreenshotFrame key={frame.src} {...frame} />
          ))}
        </div>

        <div className="ysw-request-heading">
          <div>
            <p className="ysw-kicker">Things you can ask</p>
            <h3>One page. More than one useful shape.</h3>
          </div>
          <a
            className="ysw-open-link"
            href={proof.cleanHref}
            target="_blank"
            rel="noreferrer"
          >
            {proof.cleanLabel}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="ysw-request-grid">
          {proof.prompts.map((prompt, promptIndex) => (
            <article key={prompt} className="ysw-request-card">
              <span>{String(promptIndex + 1).padStart(2, "0")}</span>
              <p>“{prompt}”</p>
              <CopyRequestButton request={prompt} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ShowcasePage() {
  return (
    <main className="ysw-showcase" id="top">
      <a className="ysw-skip" href="#proofs">
        Skip to the live proofs
      </a>

      <header className="ysw-header">
        <a className="ysw-wordmark" href="#top">
          Morph
        </a>
        <nav aria-label="Showcase navigation">
          <a href="#hearth">Shopping</a>
          <a href="#wayline">Travel</a>
          <a href="#current">News</a>
          <a
            href="https://github.com/ely2ba/morph"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ExternalLink size={13} aria-hidden="true" />
          </a>
        </nav>
      </header>

      <section className="ysw-hero" aria-labelledby="showcase-title">
        <div className="ysw-hero-inner">
          <div className="ysw-hero-copy">
            <p className="ysw-hero-kicker">A live WebMCP demonstration</p>
            <h1 id="showcase-title">Morph</h1>
            <p className="ysw-tagline">
              The page becomes the interface you need.
            </p>
            <p className="ysw-hero-lede">
              Three ordinary websites. One sentence. Countless useful
              interfaces, assembled around the person using them.
            </p>
            <p className="ysw-explanation">
              A browser assistant can ask a cooperating webpage to reorganise
              its own facts, calculations, controls, and native components. The
              result remains on the page, can be edited directly, and can be
              reshaped again through conversation.
            </p>
            <a className="ysw-hero-link" href="#proofs">
              See the pages take shape
              <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>

          <div
            className="ysw-hero-visual"
            aria-label="Three ordinary website screenshots"
          >
            <figure className="ysw-hero-frame ysw-hero-frame--hearth">
              <span>Shopping</span>
              <Image
                src="/submission/hearth-home-ordinary.png"
                width={1440}
                height={900}
                alt="Ordinary Hearth & Home washer catalogue"
                priority
                unoptimized
              />
            </figure>
            <figure className="ysw-hero-frame ysw-hero-frame--wayline">
              <span>Travel</span>
              <Image
                src="/submission/wayline-ordinary.png"
                width={1440}
                height={900}
                alt="Ordinary Wayline journey search results"
                priority
                unoptimized
              />
            </figure>
            <figure className="ysw-hero-frame ysw-hero-frame--current">
              <span>News</span>
              <Image
                src="/submission/the-current-ordinary.png"
                width={1440}
                height={900}
                alt="Ordinary The Current news homepage"
                priority
                unoptimized
              />
            </figure>
          </div>
        </div>
        <div className="ysw-colour-rule" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>

      <div id="proofs">
        {proofs.map((proof, index) => (
          <ProofSection key={proof.id} proof={proof} index={index} />
        ))}
      </div>

      <section className="ysw-loop" aria-labelledby="loop-title">
        <div className="ysw-wrap">
          <p className="ysw-kicker">The collaboration loop</p>
          <h2 id="loop-title">
            Ask <span>→</span> page composes <span>→</span> person edits{" "}
            <span>→</span> ask again
          </h2>
          <p>
            The page recomposes without losing the person’s saved, pinned,
            hidden, or locked choices.
          </p>
          <ol>
            <li>
              <span>01</span>
              <strong>Ask</strong>
              <p>Describe the interface you need in the browser assistant.</p>
            </li>
            <li>
              <span>02</span>
              <strong>The page composes</strong>
              <p>
                The website arranges its own facts, calculations, and native
                components.
              </p>
            </li>
            <li>
              <span>03</span>
              <strong>You edit</strong>
              <p>
                Compare, save, pin, hide, or lock choices directly on the page.
              </p>
            </li>
            <li>
              <span>04</span>
              <strong>Ask again</strong>
              <p>
                The same page takes a new shape while your relevant choices
                survive.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="ysw-mobile" aria-labelledby="mobile-title">
        <div className="ysw-wrap">
          <div className="ysw-mobile-heading">
            <p className="ysw-kicker">Directly editable everywhere</p>
            <h2 id="mobile-title">
              The interface still fits the person holding it.
            </h2>
            <p>
              No unexplained sideways layouts. The same controls remain useful
              at 390px.
            </p>
          </div>
          <div className="ysw-phone-grid">
            {mobileProofs.map((proof) => (
              <figure key={proof.src} className="ysw-phone">
                <div>
                  <Image
                    src={proof.src}
                    width={390}
                    height={844}
                    alt={proof.alt}
                    loading="lazy"
                    unoptimized
                  />
                </div>
                <figcaption>
                  <strong>{proof.name}</strong>
                  <span>{proof.detail}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <footer className="ysw-footer">
        <div className="ysw-wrap">
          <div>
            <strong>Morph</strong>
            <p>The page becomes the interface you need.</p>
          </div>
          <nav aria-label="Open the live experiences">
            {experienceRoutes.map((route) => (
              <a key={route.href} href={route.href}>
                {route.label}
              </a>
            ))}
            <a
              href="https://github.com/ely2ba/morph"
              target="_blank"
              rel="noreferrer"
            >
              Source <ExternalLink size={13} aria-hidden="true" />
            </a>
          </nav>
          <p className="ysw-disclaimer">
            All brands, products, journeys, operators, publications, reporters,
            people, and events shown here are fictional demonstration data.
          </p>
        </div>
      </footer>
    </main>
  );
}
