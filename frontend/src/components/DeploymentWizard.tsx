import React, { useState } from 'react';
import { useForm } from "react-hook-form" ;
import { X, CheckCircle, Copy } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Connector, DigitalTwinRegistry } from '../types';
import { getUserInfo } from '../keycloak';

interface Props {
  onClose: () => void;
  onDeploy: (connector: Connector) => void;
}

type AuthType = 'none' | 'apiKey' | 'bearer' | 'oauth2';

export default function DeploymentWizard({ onClose, onDeploy }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submodelDeployed, setSubmodelDeployed] = useState(false);
  const [submodelMode, setSubmodelMode] = useState<'new' | 'existing'>('new');
  const [hasSkipped, setHasSkipped] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    bpn: '',
    version: '0.9.0',
    submodelServiceUrl: '',
    submodelApiKey: '',
    registryUrl: '',
    registryCredentials: '',
    edcUsername: '',
    edcPassword: '',

    // --- NEU: Auth-Konfiguration ---
    submodelAuthType: 'none' as AuthType,
    submodelBearerToken: '',
    submodelOAuthAccessTokenUrl: '',
    submodelOAuthClientId: '',
    submodelOAuthClientSecret: '',
    submodelOAuthScope: 'openid',
    submodelOAuthClientAuth: 'basic', // basic | body

    registryAuthType: 'none' as AuthType,
    registryApiKey: '',
    registryBearerToken: '',
    registryOAuthAccessTokenUrl: '',
    registryOAuthClientId: '',
    registryOAuthClientSecret: '',
    registryOAuthScope: 'openid',
    registryOAuthClientAuth: 'basic',
  });

  const totalSteps = 4;

  const { register} = useForm();

  React.useEffect(()=>{
    if (formData.name) {
      setFormData((prev) => ({
        ...prev, 
        url: `https://${prev.name.toLowerCase()}.arena2036-x.de`
      }));
    }
  }, [formData.name]);

  const handleDeploySubmodel = async () => {
    try {
      await apiClient.post('/submodel/deploy', {
        url: formData.submodelServiceUrl,
        // bestehendes Verhalten beibehalten:
        apiKey:
          formData.submodelAuthType === 'apiKey'
            ? formData.submodelApiKey
            : undefined,
        type: 'submodel-service',
      });
      setSubmodelDeployed(true);
      alert('Submodel Service erfolgreich deployed!');
    } catch (error) {
      console.error('Failed to deploy submodel:', error);
      alert('Fehler beim Deployment des Submodel Service');
    }
  };

  const handleRegisterSubmodel = async () => {
    if (!formData.submodelServiceUrl) {
      alert('Bitte gib eine Service URL ein.');
      return;
    }

    try {
      setIsConnecting(true);
      const response = await apiClient.post('/submodel/connect', {
        url: formData.submodelServiceUrl,
        bpn: formData.bpn || null,
        // hier könntest du später die Auth-Infos mitgeben
      });

      if (response.status === 200) {
        alert(`Service erfolgreich verbunden: ${formData.submodelServiceUrl}`);
        setCurrentStep(currentStep + 1);
      } else {
        alert(`Fehler: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to connect existing submodel:', error);
      alert('Fehler beim Verbinden mit dem Submodel Service');
    } finally {
      setIsConnecting(false);
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
      registry: {
        url: formData.registryUrl,
        credentials: formData.registryCredentials
      },
      submodel: {
        url: formData.submodelServiceUrl,
        credentials: formData.submodelApiKey
      }
    };
    console.log(newConnector);
    onDeploy(newConnector);
    onClose();
  };

const shouldShowSkip = () => {
  if (currentStep === totalSteps) return false; // Step 4: kein Skip

  switch (currentStep) {
    case 1: // Submodel Service
      return !formData.submodelServiceUrl || formData.submodelServiceUrl.trim() === '';
    case 2: // Digital Twin Registry
      return !formData.registryUrl || formData.registryUrl.trim() === '';
    case 3: // EDC Configuration
      return !formData.name || !formData.url || !formData.bpn;
    default:
      return false;
  }
};
  const yamlPreview = `edc:
  name: ${formData.name || '<EDC Name>'}
  version: ${formData.version || '<Version>'}
  endpoint: ${formData.url || '<https://edc.example.com>'}
  bpn: ${formData.bpn || '<BPNL000000000000>'}
   authentication:
      username: ${formData.edcUsername || '<username>'}
      password: ${formData.edcPassword ? '********' : '<password>'}
  registry:
    url: ${formData.registryUrl || '<registry.example.com>'}
    credentials: ${formData.registryCredentials ? '******' : '<none>'}

`;

  const copyYaml = async () => {
    await navigator.clipboard.writeText(yamlPreview);
    alert('YAML-Konfiguration kopiert!');
  };

  const renderAuthSection = (
    prefix: 'submodel' | 'registry',
    authType: AuthType
  ) => {
    switch (authType) {
      case 'apiKey':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="text"
              value={
                prefix === 'submodel'
                  ? formData.submodelApiKey
                  : formData.registryApiKey
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ...(prefix === 'submodel'
                    ? { submodelApiKey: e.target.value }
                    : { registryApiKey: e.target.value }),
                })
              }
              placeholder="API Key"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        );
      case 'bearer':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bearer Token
            </label>
            <input
              type="text"
              value={
                prefix === 'submodel'
                  ? formData.submodelBearerToken
                  : formData.registryBearerToken
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ...(prefix === 'submodel'
                    ? { submodelBearerToken: e.target.value }
                    : { registryBearerToken: e.target.value }),
                })
              }
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        );
      case 'oauth2':
        const accessTokenUrl =
          prefix === 'submodel'
            ? formData.submodelOAuthAccessTokenUrl
            : formData.registryOAuthAccessTokenUrl;
        const clientId =
          prefix === 'submodel'
            ? formData.submodelOAuthClientId
            : formData.registryOAuthClientId;
        const clientSecret =
          prefix === 'submodel'
            ? formData.submodelOAuthClientSecret
            : formData.registryOAuthClientSecret;
        const scope =
          prefix === 'submodel'
            ? formData.submodelOAuthScope
            : formData.registryOAuthScope;
        const clientAuth =
          prefix === 'submodel'
            ? formData.submodelOAuthClientAuth
            : formData.registryOAuthClientAuth;

        const setField = (field: string, value: string) => {
          if (prefix === 'submodel') {
            setFormData({
              ...formData,
              [field]: value,
            } as any);
          } else {
            setFormData({
              ...formData,
              [field]: value,
            } as any);
          }
        };

        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token URL
              </label>
              <input
                type="text"
                value={accessTokenUrl}
                onChange={(e) =>
                  setField(
                    prefix === 'submodel'
                      ? 'submodelOAuthAccessTokenUrl'
                      : 'registryOAuthAccessTokenUrl',
                    e.target.value
                  )
                }
                placeholder="{{centralidpUrl}}/auth/realms/CX-Central/protocol/openid-connect/token"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) =>
                    setField(
                      prefix === 'submodel'
                        ? 'submodelOAuthClientId'
                        : 'registryOAuthClientId',
                      e.target.value
                    )
                  }
                  placeholder="client-id"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) =>
                    setField(
                      prefix === 'submodel'
                        ? 'submodelOAuthClientSecret'
                        : 'registryOAuthClientSecret',
                      e.target.value
                    )
                  }
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scope
                </label>
                <input
                  type="text"
                  value={scope}
                  onChange={(e) =>
                    setField(
                      prefix === 'submodel'
                        ? 'submodelOAuthScope'
                        : 'registryOAuthScope',
                      e.target.value
                    )
                  }
                  placeholder="openid"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Authentication
                </label>
                <select
                  value={clientAuth}
                  onChange={(e) =>
                    setField(
                      prefix === 'submodel'
                        ? 'submodelOAuthClientAuth'
                        : 'registryOAuthClientAuth',
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="basic">Send as Basic Auth header</option>
                  <option value="body">Send client credentials in body</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'none':
      default:
        return null;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      /** STEP 1 — SUBMODEL SERVICE **/
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

            {/* Auswahl: Neuer oder bestehender Service */}
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

            {/* Eingabefelder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service URL
              </label>
              <input
                type="text"
                value={formData.submodelServiceUrl}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    submodelServiceUrl: e.target.value,
                  })
                }
                placeholder={
                  submodelMode === 'new'
                    ? 'https://new-submodel-service.example.com'
                    : 'https://existing-submodel-service.example.com'
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* NEU: Auth Type für Submodel Service */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Type
              </label>
              <select
                value={formData.submodelAuthType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    submodelAuthType: e.target
                      .value as AuthType,
                  })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="none">No Auth</option>
                <option value="apiKey">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="oauth2">OAuth 2.0</option>
              </select>

              {renderAuthSection('submodel', formData.submodelAuthType)}
            </div>

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
                  disabled={!formData.submodelServiceUrl || isConnecting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Existing Service'}
                </button>
              )}
            </div>
          </div>
        );

      /** STEP 2 — DIGITAL TWIN REGISTRY **/
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Digital Twin Registry</h3>
            <p className="text-sm text-gray-500">
              Verbinde deinen Digital Twin Registry Service.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registry URL
              </label>
              <input
                type="text"
                value={formData.registryUrl}
                onChange={(e) =>
                  setFormData({ ...formData, registryUrl: e.target.value })
                }
                placeholder="registry.arena2036-x.de"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* NEU: Auth Type für Registry */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Type
              </label>
              <select
                value={formData.registryAuthType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registryAuthType: e.target.value as AuthType,
                  })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="none">No Auth</option>
                <option value="apiKey">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="oauth2">OAuth 2.0</option>
              </select>

              {renderAuthSection('registry', formData.registryAuthType)}
            </div>

            {/* altes Credentials-Feld kannst du bei Bedarf entfernen oder lassen */}
{/*            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credentials (optional)
              </label>
              <input
                type="password"
                value={formData.registryCredentials}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registryCredentials: e.target.value,
                  })
                }
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            */}

            <button
              disabled={!formData.registryUrl}
              onClick={() => setCurrentStep(currentStep + 1)}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Connect Registry
            </button>
          </div>
        );

      /** STEP 3 — EDC DEPLOYMENT CONFIG **/
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">EDC Deployment Configuration</h3>
            <p className="text-sm text-gray-500">
              Bitte gib die EDC-Informationen für den Deployment-Vorgang ein.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EDC Name
                </label>
                <input
                  {...register("name")}
                  type="text"
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Provider EDC"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EDC Version
                </label>
                <select
                  value={formData.version}
                  onChange={(e) =>
                    setFormData({ ...formData, version: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="0.9.0">0.9.0</option>
                  <option value="0.10.0">0.10.0</option>
                  <option value="0.11.0">0.11.0</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  value={formData.url}
                  readOnly
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://edc.arena2036-x.de"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Partner Number (BPN)
                </label>
                <input
                  type="text"
                  value={formData.bpn}
                  onChange={(e) =>
                    setFormData({ ...formData, bpn: e.target.value })
                  }
                  placeholder="BPNL000000000000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={formData.edcUsername}
                          onChange={(e) =>
                            setFormData({ ...formData, edcUsername: e.target.value })
                          }
                          placeholder="EDC Benutzername"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
              </div>
              <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={formData.edcPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, edcPassword: e.target.value })
                          }
                          placeholder="••••••••"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>




            {/* YAML Preview */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YAML Preview
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={yamlPreview}
                  rows={6}
                  className="w-full font-mono text-sm px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
                <button
                  onClick={copyYaml}
                  className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-800"
                  title="Copy YAML"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        );

      /** STEP 4 — REVIEW & DEPLOY **/
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review & Deploy</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <p>
                <strong>EDC Name:</strong> {formData.name}
              </p>
              <p>
                <strong>Version:</strong> {formData.version}
              </p>
              <p>
                <strong>Endpoint:</strong> {formData.url}
              </p>
              <p>
                <strong>BPN:</strong> {formData.bpn}
              </p>
              <p>
                <strong>Registry:</strong> {formData.registryUrl}
              </p>
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
            <h2 className="text-2xl font-bold text-gray-900">
              Deploy EDC Connector
            </h2>
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

            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={
                currentStep < totalSteps ? () => setCurrentStep(currentStep + 1) : handleSubmit
              }
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