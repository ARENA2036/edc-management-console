import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, CheckCircle } from 'lucide-react'; // 'Copy' entfernt, da es nicht verwendet wird
import { apiClient } from '../api/client';
import type { Connector } from '../types'; // Keine Verwendung von DigitalTwinRegistry

interface Props {
  onClose: () => void;
  onDeploy: (connector: Connector) => void;
}

type AuthType = 'none' | 'apiKey' | 'bearer' | 'oauth2';

export default function DeploymentWizard({ onClose, onDeploy }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submodelDeployed, setSubmodelDeployed] = useState(false);
  const [submodelMode, setSubmodelMode] = useState<'new' | 'existing'>('new');
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    bpn: '',
    version: '0.9.0',
    submodelName: '',
    submodelServiceUrl: '',
    submodelApiKey: '',
    registryName: '',
    registryUrl: '',
    registryCredentials: '',
    edcUsername: '',
    edcPassword: '',
    submodelAuthType: 'none' as AuthType,
    registryAuthType: 'none' as AuthType,
  });

  const { register } = useForm();

  const isBpnInvalid =
    formData.bpn.length > 0 && formData.bpn.length !== 16;

  const isCredentialsMissing =
    !formData.edcUsername.trim() || !formData.edcPassword.trim();

  const handleSubmit = () => {
    const newConnector: Connector = {
      id: Date.now(),
      name: formData.name,
      url: formData.url,
      bpn: formData.bpn,
      version: formData.version,
      status: 'connected',
      created_at: new Date().toISOString(),
      db_username: formData.edcUsername,
      db_password: formData.edcPassword,
      registry: {
        url: formData.registryUrl ? formData.registryUrl : '',
        credentials: '',
      },
      submodel: {
        url: formData.submodelServiceUrl ? formData.submodelServiceUrl : '',
        credentials: '',
      },
    };
    console.log(newConnector);
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
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${submodelMode === 'new'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                Neuen Submodel hinzufügen
              </button>
              <button
                onClick={() => setSubmodelMode('existing')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${submodelMode === 'existing'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }
                disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed
                `}
                disabled
              >
                Existierenden Server verbinden
              </button>
            </div>
            <div>
              <p className="text-center text-sm text-orange-600 bg-orange-50 py-1 rounded mb-2">
                Only lowercase letters and numbers allowed
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submodel Service Name
              </label>

              <input
                type="text"
                value={formData.submodelName}
                {...register('submodelName')}
                onChange={(e) => {
                  const sname = e.target.value;
                  setFormData({
                    ...formData,
                    submodelName: sname,
                    submodelServiceUrl:
                      sname.length > 0 ? `${sname}-txcd.arena2036-x.de` : '',
                  });
                }}
                placeholder="submodel"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submodel Hostname
              </label>
              <input
                type="text"
                value={formData.submodelServiceUrl}
                readOnly
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    submodelServiceUrl: e.target.value,
                  })
                }
                placeholder={
                  submodelMode === 'new'
                    ? 'submodel-txcd.arena2036-x.de'
                    : 'existing-submodel-txcd.example.com'
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentStep === 3) {
      if (isBpnInvalid || isCredentialsMissing) {
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-xl md:rounded-xl shadow-2xl w-full max-h-[90vh] md:max-h-[85vh] md:max-w-2xl md:mx-4 flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Deploy EDC Connector
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Step {currentStep} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <div className="flex justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded-full mx-1 ${step <= currentStep ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                />
              ))}
            </div>
          </div>

          {renderStepContent()}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 p-4 md:p-6 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 md:px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {(currentStep == 1 || currentStep == 2) && (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={currentStep < 4 ? handleNext : handleSubmit}
              disabled={currentStep === 3 && (isBpnInvalid || isCredentialsMissing)}
              className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-lg font-medium transition-colors text-white ${currentStep === 3 && (isBpnInvalid || isCredentialsMissing)
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600"
                }`}
            >
              {currentStep === 4 ? 'Deploy EDC' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}