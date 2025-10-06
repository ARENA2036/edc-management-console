import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Connector } from '../types';

interface Props {
  onClose: () => void;
  onDeploy: (connector: Connector) => void;
}

export default function DeploymentWizard({ onClose, onDeploy }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submodelDeployed, setSubmodelDeployed] = useState(false);
  const [submodelMode, setSubmodelMode] = useState<'new' | 'existing'>('new');
  const [hasSkipped, setHasSkipped] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    bpn: '',
    version: '0.6.0',
    submodelServiceUrl: '',
    submodelApiKey: '',
  });

  const totalSteps = 4;

  const handleDeploySubmodel = async () => {
    try {
      await apiClient.post('/submodel/deploy', {
        url: formData.submodelServiceUrl,
        apiKey: formData.submodelApiKey,
        type: 'submodel-service'
      });
      setSubmodelDeployed(true);
      alert('Submodel Service erfolgreich deployed!');
    } catch (error) {
      console.error('Failed to deploy submodel:', error);
      alert('Fehler beim Deployment des Submodel Service');
    }
  };

  const handleRegisterSubmodel = async () => {
    try {
      await apiClient.post('/submodel/register', {
        url: formData.submodelServiceUrl,
        bpn: formData.bpn
      });
      alert('Submodel Service erfolgreich registriert!');
    } catch (error) {
      console.error('Failed to register submodel:', error);
      alert('Fehler bei der Registrierung des Submodel Service');
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSkip = () => {
    setHasSkipped(true);
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const newConnector: Connector = {
      id: Date.now(),
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Submodel Service</h3>
              {submodelDeployed && (
                <span className="flex items-center text-green-600 text-sm">
                  <CheckCircle size={16} className="mr-1" />
                  Deployed
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <button
                onClick={() => setSubmodelMode('new')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  submodelMode === 'new'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Neuen Submodel hinzufügen
              </button>
              <button
                onClick={() => setSubmodelMode('existing')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  submodelMode === 'existing'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Existierenden Server verbinden
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service URL
              </label>
              <input
                type="text"
                value={formData.submodelServiceUrl}
                onChange={(e) => setFormData({ ...formData, submodelServiceUrl: e.target.value })}
                placeholder={submodelMode === 'new' ? "https://new-submodel-service.example.com" : "https://existing-submodel-service.example.com"}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            {submodelMode === 'new' && (
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
            )}
            
            <div className="flex gap-3 pt-4 border-t">
              {submodelMode === 'new' ? (
                <>
                  <button
                    onClick={handleDeploySubmodel}
                    disabled={!formData.submodelServiceUrl}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Deploy Submodel Service
                  </button>
                  {submodelDeployed && (
                    <button
                      onClick={handleRegisterSubmodel}
                      disabled={!formData.bpn}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Register Service
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleRegisterSubmodel}
                  disabled={!formData.submodelServiceUrl || !formData.bpn}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Connect Existing Service
                </button>
              )}
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleDeploySubmodel}
                disabled={!formData.submodelServiceUrl}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Deploy Submodel Service
              </button>
              {submodelDeployed && (
                <button
                  onClick={handleRegisterSubmodel}
                  disabled={!formData.bpn}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Register Service
                </button>
              )}
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
                placeholder="https://edc.example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                EDC Version
              </label>
              <select
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="0.6.0">0.6.0</option>
                <option value="0.7.0">0.7.0</option>
                <option value="0.8.0">0.8.0</option>
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">BPN Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Partner Number (BPN)
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
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <span className="text-sm text-gray-500">EDC Name:</span>
                <p className="font-medium">{formData.name || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">EDC URL:</span>
                <p className="font-medium">{formData.url || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">BPN:</span>
                <p className="font-medium">{formData.bpn || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Version:</span>
                <p className="font-medium">{formData.version}</p>
              </div>
              {submodelDeployed && (
                <div>
                  <span className="text-sm text-gray-500">Submodel Service:</span>
                  <p className="font-medium text-green-600">✓ Deployed</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Deploy EDC Connector</h2>
            <p className="text-sm text-gray-500 mt-1">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded-full mx-1 ${
                    step <= currentStep ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {renderStepContent()}
        </div>

        <div className="flex justify-between items-center p-6 border-t bg-gray-50 rounded-b-xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            {(currentStep > 1 || hasSkipped) && (
              <button
                onClick={handlePrevious}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {currentStep < totalSteps && (
              <button
                onClick={handleSkip}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              {currentStep === totalSteps ? 'Deploy EDC' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
