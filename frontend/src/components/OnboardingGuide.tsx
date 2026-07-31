import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  MonitorSmartphone,
  SquareDashedBottomCode,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useLockBodyScroll } from '../useLockBodyScroll';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StepDefinition {
  title: string;
  subtitle: string;
  content: 'welcome' | 'overview' | 'getting-started' | 'support';
}

export default function OnboardingGuide({ open, onClose }: Props) {
  const { t } = useI18n();
  useLockBodyScroll(open);
  const [step, setStep] = useState(0);

  const steps = useMemo<StepDefinition[]>(
    () => [
      {
        title: t('onboardingWelcomeTitle'),
        subtitle: t('onboardingWelcomeSubtitle'),
        content: 'welcome',
      },
      {
        title: t('onboardingOverviewTitle'),
        subtitle: t('onboardingOverviewSubtitle'),
        content: 'overview',
      },
      {
        title: t('onboardingGettingStartedTitle'),
        subtitle: t('onboardingGettingStartedSubtitle'),
        content: 'getting-started',
      },
      {
        title: t('onboardingSupportTitle'),
        subtitle: t('onboardingSupportSubtitle'),
        content: 'support',
      },
    ],
    [t],
  );

  if (!open) {
    return null;
  }

  const currentStep = steps[step];

  const closeGuide = () => {
    setStep(0);
    onClose();
  };

  const nextStep = () => {
    if (step === steps.length - 1) {
      closeGuide();
      return;
    }
    setStep((current) => current + 1);
  };

  const previousStep = () => {
    setStep((current) => Math.max(0, current - 1));
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden overscroll-contain rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
          <div className="pr-4">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-slate-100 sm:text-4xl">
              {currentStep.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-500 dark:text-slate-400 sm:text-[1.15rem]">
              {currentStep.subtitle}
            </p>
          </div>
          <button
            onClick={closeGuide}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('close')}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-7">
          {currentStep.content === 'welcome' && (
            <div className="space-y-8">
              <p className="text-lg leading-8 text-gray-600 dark:text-slate-300">
                {t('onboardingWelcomeIntro')}
              </p>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-5 dark:border-blue-500/30 dark:bg-blue-500/10">
                <h3 className="text-2xl font-semibold text-blue-900">
                  {t('onboardingCanDoTitle')}
                </h3>
                <ul className="mt-4 space-y-4 text-lg leading-8 text-blue-800 dark:text-blue-100">
                  {[
                    t('onboardingCanDoItem1'),
                    t('onboardingCanDoItem2'),
                    t('onboardingCanDoItem3'),
                    t('onboardingCanDoItem4'),
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <Check size={20} className="mt-1 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {currentStep.content === 'overview' && (
            <div className="space-y-5">
              {[
                {
                  color: 'bg-blue-500',
                  title: t('onboardingOverviewStatusCardsTitle'),
                  body: t('onboardingOverviewStatusCardsBody'),
                },
                {
                  color: 'bg-green-500',
                  title: t('onboardingOverviewConnectorTableTitle'),
                  body: t('onboardingOverviewConnectorTableBody'),
                },
                {
                  color: 'bg-purple-500',
                  title: t('onboardingOverviewNavigationTitle'),
                  body: t('onboardingOverviewNavigationBody'),
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className={`mt-1 h-24 w-1 rounded-full ${item.color}`} />
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-lg leading-8 text-gray-600 dark:text-slate-300">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentStep.content === 'getting-started' && (
            <div className="space-y-6">
              {[
                {
                  number: '1',
                  title: t('onboardingStep1Title'),
                  body: t('onboardingStep1Body'),
                },
                {
                  number: '2',
                  title: t('onboardingStep2Title'),
                  body: t('onboardingStep2Body'),
                },
                {
                  number: '3',
                  title: t('onboardingStep3Title'),
                  body: t('onboardingStep3Body'),
                },
              ].map((item) => (
                <div key={item.number} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-semibold text-white shadow-sm">
                    {item.number}
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-lg leading-8 text-gray-600 dark:text-slate-300">{item.body}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-lg leading-8 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <span className="font-semibold">{t('tipLabel')}:</span>{' '}
                {t('onboardingTipBody')}
              </div>
            </div>
          )}

          {currentStep.content === 'support' && (
            <div className="space-y-5">
              <p className="text-lg leading-8 text-gray-600">
                {t('onboardingSupportIntro')}
              </p>
              {[
                {
                  icon: <CircleHelp size={18} />,
                  title: t('onboardingSupportInlineTitle'),
                  body: t('onboardingSupportInlineBody'),
                },
                {
                  icon: <SquareDashedBottomCode size={18} />,
                  title: t('onboardingSupportConfirmTitle'),
                  body: t('onboardingSupportConfirmBody'),
                },
                {
                  icon: <MonitorSmartphone size={18} />,
                  title: t('onboardingSupportResponsiveTitle'),
                  body: t('onboardingSupportResponsiveBody'),
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-gray-50 px-5 py-5 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                    <span className="text-orange-500">{item.icon}</span>
                    {item.title}
                  </div>
                  <p className="mt-3 text-lg leading-8 text-gray-600">{item.body}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center">
                <h3 className="text-2xl font-semibold text-emerald-800">
                  {t('onboardingReadyTitle')}
                </h3>
                <p className="mt-2 text-lg leading-8 text-emerald-700">
                  {t('onboardingReadyBody')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4 sm:px-7">
          <div className="mb-4 flex justify-center gap-2">
            {steps.map((stepItem, index) => (
              <span
                key={stepItem.title}
                className={`h-2.5 rounded-full transition-all ${
                  index === step ? 'w-10 bg-orange-500' : 'w-2.5 bg-orange-200'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="order-2 flex items-center gap-3 sm:order-1">
              {step > 0 ? (
                <button
                  onClick={previousStep}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <ArrowLeft size={18} />
                  {t('back')}
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="order-3 text-center text-base font-medium text-gray-400 sm:order-2">
              {t('onboardingStepCounter', {
                current: String(step + 1),
                total: String(steps.length),
              })}
            </div>

            <div className="order-1 flex items-center justify-between gap-3 sm:order-3 sm:justify-end">
              <button
                onClick={closeGuide}
                className="px-2 py-2 text-base font-semibold text-gray-700 transition-colors hover:text-gray-900"
              >
                {t('skip')}
              </button>
              <button
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-orange-600"
              >
                {step === steps.length - 1 ? t('done') : t('next')}
                {step !== steps.length - 1 && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
