import { useState } from 'react';
import { X } from 'lucide-react';
import type { Connector } from '../types';

interface Props {
  onClose: () => void;
  onDeploy: (connector: Connector) => void;
}

export default function DeploymentWizard({ onClose, onDeploy }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    bpn: '',
    version: '0.6.0',
    submodelServiceUrl: '',
    submodelApiKey: '',
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSkip = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const newConnector: Connector = {
      id: Date.now().toString(),
      name: formData.name,
      url: formData.url,
      bpn: formData.bpn,
      version: formData.version,
      status: 'connected',
      created_at: new Date().toISOString(),
    };
    onDeploy(newConnector);
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Submodel Service</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service URL
              </label>
              <input
                type="text"
                value={formData.submodelServiceUrl}
                onChange={(e) => setFormData({ ...formData, submodelServiceUrl: e.target.value })}
                placeholder="https://submodel-service.example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="text"
                value={formData.submodelApiKey}
                onChange={(e) => setFormData({ ...formData, submodelApiKey: e.target.value })}
                placeholder="Enter API key"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">EDC Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                EDC Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Provider EDC"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                EDC URL
              </label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="http://localhost:8080/management"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Business Partner Number</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                BPN
              </label>
              <input
                type="text"
                value={formData.bpn}
                onChange={(e) => setFormData({ ...formData, bpn: e.target.value })}
                placeholder="BPNL000000000000"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review & Deploy</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-500">EDC Name</p>
                <p className="font-medium">{formData.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">EDC URL</p>
                <p className="font-medium">{formData.url || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">BPN</p>
                <p className="font-medium">{formData.bpn || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Version</p>
                <p className="font-medium">{formData.version}</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-3xl w-full mx-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">EDC Deployment Wizard</h2>
            <p className="text-gray-500 mt-1">
              Follow these steps to deploy your EDC. You can skip steps or jump directly to EDC.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-colors ${
                  step === currentStep
                    ? 'bg-orange-500 text-white'
                    : step < currentStep
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-0.5 ${step < currentStep ? 'bg-orange-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mb-8 min-h-[300px]">{renderStepContent()}</div>

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {currentStep < totalSteps && (
              <button
                onClick={handleSkip}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-orange-400 hover:bg-orange-500 text-white rounded-lg transition-colors"
            >
              {currentStep === totalSteps ? 'Deploy' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
