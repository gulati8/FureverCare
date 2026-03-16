import { HowItWorksContent, HowItWorksStep } from '../../api/cms';

interface HowItWorksProps {
  content: HowItWorksContent;
}

function StepCard({ step, isLast }: { step: HowItWorksStep; isLast: boolean }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div
        className="flex items-center justify-center text-xl font-bold mb-4 relative z-10"
        style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--color-navy)', color: 'white',
          fontFamily: 'var(--font-heading)',
        }}
      >
        {step.number}
      </div>

      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-navy)' }}>
        {step.title}
      </h3>
      <p className="max-w-xs" style={{ color: 'var(--color-surface-600)' }}>
        {step.description}
      </p>

      {!isLast && (
        <div
          className="hidden lg:block absolute top-7"
          style={{
            left: 'calc(50% + 28px)',
            width: 'calc(100% - 56px)',
            height: '2px',
            background: 'var(--color-navy-50)',
          }}
        />
      )}
    </div>
  );
}

function StepCardMobile({ step, isLast }: { step: HowItWorksStep; isLast: boolean }) {
  return (
    <div className="relative flex items-start">
      <div className="flex flex-col items-center mr-6">
        <div
          className="flex items-center justify-center text-lg font-bold relative z-10"
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'var(--color-navy)', color: 'white',
            fontFamily: 'var(--font-heading)',
          }}
        >
          {step.number}
        </div>
        {!isLast && (
          <div
            className="absolute left-6 -translate-x-1/2"
            style={{ top: '48px', width: '2px', height: 'calc(100% - 48px)', background: 'var(--color-navy-50)' }}
          />
        )}
      </div>

      <div className="pb-8">
        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-navy)' }}>
          {step.title}
        </h3>
        <p style={{ color: 'var(--color-surface-600)' }}>
          {step.description}
        </p>
      </div>
    </div>
  );
}

export default function HowItWorks({ content }: HowItWorksProps) {
  const { title, subtitle, steps } = content;

  return (
    <section id="how-it-works" className="py-20 md:py-28" style={{ background: 'var(--color-white)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl mb-4" style={{ color: 'var(--color-navy)', fontWeight: 700 }}>
            {title}
          </h2>
          <p className="text-lg" style={{ color: 'var(--color-surface-600)' }}>
            {subtitle}
          </p>
        </div>

        <div className="hidden lg:grid lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} isLast={index === steps.length - 1} />
          ))}
        </div>

        <div className="lg:hidden max-w-md mx-auto">
          {steps.map((step, index) => (
            <StepCardMobile key={step.number} step={step} isLast={index === steps.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
