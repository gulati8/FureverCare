import { HowItWorksContent, HowItWorksStep } from '../../api/cms';

interface HowItWorksProps {
  content: HowItWorksContent;
}

function StepCard({ step, isLast }: { step: HowItWorksStep; isLast: boolean }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Step Number Circle */}
      <div className="w-14 h-14 bg-primary-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4 relative z-10">
        {step.number}
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {step.title}
      </h3>
      <p className="text-gray-600 max-w-xs">
        {step.description}
      </p>

      {/* Connector Line (desktop) - hidden on last item */}
      {!isLast && (
        <div className="hidden lg:block absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-0.5 bg-primary-200" />
      )}
    </div>
  );
}

function StepCardMobile({ step, isLast }: { step: HowItWorksStep; isLast: boolean }) {
  return (
    <div className="relative flex items-start">
      {/* Timeline */}
      <div className="flex flex-col items-center mr-6">
        {/* Step Number Circle */}
        <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center text-lg font-bold relative z-10">
          {step.number}
        </div>
        {/* Connector Line - hidden on last item */}
        {!isLast && (
          <div className="w-0.5 h-full bg-primary-200 absolute top-12 left-6 transform -translate-x-1/2" style={{ height: 'calc(100% - 48px)' }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {step.title}
        </h3>
        <p className="text-gray-600">
          {step.description}
        </p>
      </div>
    </div>
  );
}

export default function HowItWorks({ content }: HowItWorksProps) {
  const { title, subtitle, steps } = content;

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600">
            {subtitle}
          </p>
        </div>

        {/* Desktop Timeline - Horizontal */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <StepCard
              key={step.number}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* Mobile Timeline - Vertical */}
        <div className="lg:hidden max-w-md mx-auto">
          {steps.map((step, index) => (
            <StepCardMobile
              key={step.number}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
