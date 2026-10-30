import { useState } from 'react'

const lessons = [
  {
    title: 'When the thought is “I’ll win it back”',
    body: 'A loss can make it tempting to keep playing in an attempt to recover money. Pause and notice that urge as a thought, not a certainty about what will happen next. You could ask: “What do I know for sure right now, and what am I hoping will happen?”',
  },
  {
    title: 'Notice what happens before an urge',
    body: 'An urge may follow a feeling, situation, habit, or reminder. If you choose, write down what was happening beforehand and what helped you move through the moment. These notes are for reflection and do not diagnose a condition.',
  },
  {
    title: 'Make a plan for a difficult moment',
    body: 'Consider one small action you can take if an urge appears: step away from a device, contact someone you trust, or use a pause tool. Choose an option that feels practical for you; no exercise guarantees a particular outcome.',
  },
]

function GetSupportPage() {
  const [openLesson, setOpenLesson] = useState<number | null>(null)

  return (
    <div className="get-support-page">
      <section aria-labelledby="support-page-title" className="support-card">
        <p className="eyebrow">Practical, self-guided material</p>
        <h1 id="support-page-title" tabIndex={-1}>Get Support</h1>
        <p className="support-page-intro">
          These short, original reflection prompts are educational self-help
          material. They are not therapy and do not diagnose, treat, or promise
          recovery. You can use them without AI.
        </p>
        <div className="lesson-list">
          {lessons.map((lesson, index) => {
            const isOpen = openLesson === index
            const panelId = `support-lesson-${index + 1}`
            return (
              <article className="lesson-item" key={lesson.title}>
                <h3>
                  <button
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    className="lesson-toggle"
                    onClick={() =>
                      setOpenLesson(isOpen ? null : index)
                    }
                    type="button"
                  >
                    <span>{lesson.title}</span>
                    <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </button>
                </h3>
                {isOpen && (
                  <p className="lesson-body" id={panelId}>
                    {lesson.body}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section
        aria-labelledby="verified-resources-title"
        className="support-card verified-resources"
      >
        <p className="eyebrow">Human support</p>
        <h2 id="verified-resources-title">Support resources</h2>
        <p>
          No telephone numbers, providers, or self-exclusion instructions are
          published here because their details have not been independently
          verified for release. Confirm current services through an
          authoritative provider or regulator before relying on them.
        </p>
        <div className="resource-verification-status" role="status">
          Resource directory status: details require verification before
          publication.
        </div>
        <p>
          If you would like another person alongside you, you may consider
          contacting someone you trust using your own contact method.
        </p>
      </section>
    </div>
  )
}

export default GetSupportPage
