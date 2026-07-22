import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Language = 'en' | 'de';

const LANGUAGE_STORAGE_KEY = 'dashboard_language';

const translations = {
  en: {
    dashboard: 'Dashboard',
    welcome: 'Welcome to your EDC Management Console',
    dataSpace: 'Data Space',
    systemHealth: 'System Health',
    activity: 'Activity',
    edcConnectors: 'EDC Connectors',
    componentsServices: 'Components & Services',
    addPlus: 'Add+',
    allSourcesMonitored: 'All sources monitored',
    allSystemsOperational: 'All systems operational',
    syncRunning: 'Sync running',
    activeShort: 'active',
    addSelectionTitle: 'Add a new item',
    addSelectionSubtitle: 'Choose whether you want to deploy a connector or add a linked service.',
    edcConnectorOption: 'EDC Connector',
    edcConnectorOptionHint: 'Deploy a new Eclipse Dataspace Connector instance.',
    componentOption: 'Component / Service',
    componentOptionHint: 'Add a submodel service or another linked component.',
    stepCount: 'steps',
    tipLabel: 'Tip',
    addSelectionTip: 'Use connectors as the base layer, then attach services and components to them.',
    deployConnector: 'Deploy connector',
    connectorNameStep: 'Name your connector',
    connectorTypeStep: 'Select connector type',
    connectorEndpointsStep: 'Configure endpoints',
    continue: 'Continue',
    next: 'Next',
    back: 'Back',
    cancel: 'Cancel',
    skip: 'Skip',
    done: 'Done',
    deployNow: 'Deploy now',
    connectorNameLabel: 'Connector name',
    connectorNamePlaceholder: 'Production-EDC-01',
    connectorNameHelp: 'Use a short recognizable name so your team can identify the connector quickly.',
    connectorTypeLabel: 'Connector type',
    connectorTypeConsumer: 'Consumer',
    connectorTypeProvider: 'Provider',
    connectorTypeBoth: 'Consumer & Provider',
    connectorTypeHelp: 'Pick the role that best matches how this connector participates in data exchange.',
    apiEndpointLabel: 'API endpoint',
    apiEndpointPlaceholder: 'https://edc-dataplane.abc.com/edc',
    dataPlaneLabel: 'Data Plane URL',
    dataPlanePlaceholder: 'https://edc-dataplane.abc.com',
    endpointHelp: 'These endpoints are used to display and manage the connector in the dashboard.',
    addComponent: 'Add component',
    componentTypeStep: 'Choose component type',
    componentConfigStep: 'Configure component',
    componentTypeLabel: 'Component type',
    componentTypeSubmodel: 'Submodel Service',
    componentTypeTwin: 'Digital Twin Registry',
    componentTypeCatalog: 'Data Catalog',
    componentNameLabel: 'Component name',
    componentNamePlaceholderSubmodel: 'Submodel Service EU-1',
    componentNamePlaceholderTwin: 'Digital Twin Registry EU-1',
    "submodelNamePlaceholder": "Submodel Server Name",
    "dtrNamePlaceholder": "Digital Twin Registry Name",
    "submodelEndpointPlaceholder": "submodel.example.com",
    "dtrEndpointPlaceholder": "dtr.example.com",
    "submodelDbPlaceholder": "submodel-name-db",
    "dtrDbPlaceholder": "dtr-name-db",
    linkedConnectorLabel: 'Link to EDC connector',
    linkedConnectorPlaceholder: 'Select a connector',
    componentHelp: 'Components are attached to an existing EDC connector so users understand the relationship.',
    componentGuidanceChoose:
      'Choose the service type based on its job: Submodel Service for asset data or Digital Twin Registry for registration functions.',
    componentGuidanceConfig:
      'For the setup you usually need an existing connector plus the name or service URL from your project or operations documentation.',
    componentGuidanceWhere:
      'These values often come from the service owner, Helm or Kubernetes values, API documentation or your platform wiki.',
    componentGuidanceRestriction:
      'Services can be deployed independently or linked to an existing connector if you choose one below.',
    componentTypeSubmodelDescription: 'Submodel Service',
    componentTypeTwinDescription: 'Digital Twin Registry',
    initialLinkedConnectorHint:
      'This component is pre-linked to "{name}" so you can continue faster. You can still change it if needed.',
    serviceModeLabel: 'Service mode',
    serviceModeNewTitle: 'Deploy new',
    serviceModeNewDescription:
      'Register the service as a new component in the dashboard.',
    serviceModeExistingTitle: 'Connect existing',
    serviceModeExistingDescription:
      'Use an already running DTR or submodel service.',
    existingServiceUrlLabel: 'Existing service URL',
    existingServiceUrlPlaceholderSubmodel: 'https://submodel.example.com',
    existingServiceUrlPlaceholderTwin: 'https://registry.example.com',
    credentialsApiKeyLabel: 'Credentials / API Key',
    optionalAccessValuePlaceholder: 'Optional access value',
    validationRequired: 'Please enter {field}.',
    validationInvalidUrl:
      'Enter a valid URL starting with http:// or https://.',
    connectorTypeDefault: 'EDC Connector',
    noConnectorsForComponents: 'Create at least one EDC connector before adding components or services.',
    connectorsSectionSubtitle: 'Your Eclipse Dataspace Connectors',
    componentsSectionSubtitle: 'Submodel services, digital twin registries and related services',
    tableName: 'Name',
    tableVersion: 'Version',
    tableType: 'Type',
    tableStatus: 'Status',
    tableEndpoint: 'Endpoint',
    tableActions: 'Actions',
    tableLinkedTo: 'Linked to',
    tableManage: 'Manage',
    tableDelete: 'Delete',
    tableMore: 'More options',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    statusHealthy: 'Healthy',
    noConnectorsTitle: 'No EDC connectors yet',
    noConnectorsDescription: 'Click "Add+" to deploy your first connector.',
    noComponentsTitle: 'No components or services yet',
    noComponentsDescription: 'Add a component and link it to one of your connectors.',
    help: 'Help',
    helpSupport: 'Help & support',
    helpDescription: 'Find the main onboarding and support entry points for the dashboard.',
    helpFaq: 'FAQs',
    helpDocs: 'Documentation',
    helpTroubleshooting: 'Troubleshooting',
    helpContact: 'Contact support',
    sidebarMonitor: 'Monitor',
    sidebarApp: 'App',
    datasourceSettings: 'Datasource Settings',
    languageEnglish: 'EN',
    languageGerman: 'DE',
    helpButton: 'Open help',
    userAdministrator: 'Administrator',
    monitorTitle: 'Monitor',
    monitorComingSoon: 'System monitoring is coming soon...',
    settingsTitle: 'Dataspace Settings',
    settingsLoading: 'Loading settings...',
    settingsDescription:
      'These dataspace and platform settings are shown for reference and cannot be modified here.',
    footerCopyright: 'Copyright © ARENA2036-X',
    deleteConnectorTitle: 'Delete connector',
    deleteConnectorMessage:
      'Are you sure you want to delete "{name}"? This action cannot be undone.',
    deleteComponentTitle: 'Delete component',
    deleteComponentMessage:
      'Are you sure you want to delete "{name}"? This action cannot be undone.',
    confirmDelete: 'Delete',
    close: 'Close',
    details: 'Details',
    noValue: 'N/A',
    reopenHelp: 'Open onboarding help',
    reopenGuideButton: 'Open onboarding guide',
    dataspaceFallback: 'Loading...',
  },
  de: {
    dashboard: 'Dashboard',
    welcome: 'Willkommen in Ihrer EDC Management Console',
    dataSpace: 'Data Space',
    systemHealth: 'System-Status',
    activity: 'Aktivität',
    edcConnectors: 'EDC Connectors',
    componentsServices: 'Components & Services',
    addPlus: 'Add+',
    allSourcesMonitored: 'Alle Quellen überwacht',
    allSystemsOperational: 'Alle Systeme betriebsbereit',
    syncRunning: 'Synchronisierung läuft',
    activeShort: 'aktiv',
    addSelectionTitle: 'Neues Element hinzufügen',
    addSelectionSubtitle:
      'Wählen Sie aus, ob Sie einen Connector bereitstellen oder einen verknüpften Service hinzufügen möchten.',
    edcConnectorOption: 'EDC Connector',
    edcConnectorOptionHint: 'Stellen Sie eine neue Eclipse-Dataspace-Connector-Instanz bereit.',
    componentOption: 'Komponente / Service',
    componentOptionHint: 'Fügen Sie einen Submodel-Service oder eine verknüpfte Komponente hinzu.',
    stepCount: 'Schritte',
    tipLabel: 'Tipp',
    addSelectionTip:
      'Verwenden Sie Connectoren als Basis und hängen Sie danach Services und Komponenten daran an.',
    deployConnector: 'Connector bereitstellen',
    connectorNameStep: 'Connector benennen',
    connectorTypeStep: 'Connectortyp auswählen',
    connectorEndpointsStep: 'Endpoints konfigurieren',
    continue: 'Weiter',
    next: 'Weiter',
    back: 'Zurück',
    cancel: 'Abbrechen',
    skip: 'Überspringen',
    done: 'Fertig',
    deployNow: 'Jetzt bereitstellen',
    connectorNameLabel: 'Connector-Name',
    connectorNamePlaceholder: 'Production-EDC-01',
    connectorNameHelp:
      'Verwenden Sie einen kurzen, eindeutigen Namen, damit Ihr Team den Connector schnell erkennt.',
    connectorTypeLabel: 'Connectortyp',
    connectorTypeConsumer: 'Consumer',
    connectorTypeProvider: 'Provider',
    connectorTypeBoth: 'Consumer & Provider',
    connectorTypeHelp:
      'Wählen Sie die Rolle, die am besten beschreibt, wie dieser Connector am Datenaustausch teilnimmt.',
    apiEndpointLabel: 'API-Endpoint',
    apiEndpointPlaceholder: 'https://api.example.com/edc',
    dataPlaneLabel: 'Data Plane URL',
    dataPlanePlaceholder: 'https://data.example.com',
    endpointHelp:
      'Diese Endpoints werden verwendet, um den Connector im Dashboard anzuzeigen und zu verwalten.',
    addComponent: 'Komponente hinzufügen',
    componentTypeStep: 'Komponententyp wählen',
    componentConfigStep: 'Komponente konfigurieren',
    componentTypeLabel: 'Komponententyp',
    componentTypeSubmodel: 'Submodel Service',
    componentTypeTwin: 'Digital Twin Registry',
    componentTypeCatalog: 'Data Catalog',
    componentNameLabel: 'Komponentenname',
    componentNamePlaceholderSubmodel: 'Submodel Service EU-1',
    componentNamePlaceholderTwin: 'Digital Twin Registry EU-1',
    "submodelNamePlaceholder": "Submodel Server Name",
    "dtrNamePlaceholder": "Digital Twin Registry Name",
    "submodelEndpointPlaceholder": "submodel.example.com",
    "dtrEndpointPlaceholder": "dtr.example.com",
    "submodelDbPlaceholder": "submodel-name-db",
    "dtrDbPlaceholder": "dtr-name-db",
    linkedConnectorLabel: 'Mit EDC Connector verknüpfen',
    linkedConnectorPlaceholder: 'Connector auswählen',
    componentHelp:
      'Komponenten werden mit einem bestehenden EDC Connector verknüpft, damit die Beziehung im Dashboard klar bleibt.',
    componentGuidanceChoose:
      'Wählen Sie den Service-Typ nach seiner Aufgabe: Submodel Service für Asset-Daten oder Digital Twin Registry für Registrierungsfunktionen.',
    componentGuidanceConfig:
      'Für die Verknüpfung benötigen Sie normalerweise den passenden Connector sowie den Namen oder die URL des Zielservices aus Ihrer Betriebs- oder Projekt-Dokumentation.',
    componentGuidanceWhere:
      'Diese Informationen kommen häufig vom Service-Verantwortlichen, aus Helm-/Kubernetes-Werten, API-Dokumentation oder aus Ihrem Plattform-Wiki.',
    componentGuidanceRestriction:
      'Services können eigenständig deployt oder mit einem vorhandenen Connector verknüpft werden, wenn Sie einen unten auswählen.',
    componentTypeSubmodelDescription: 'Submodel Service',
    componentTypeTwinDescription: 'Digital Twin Registry',
    initialLinkedConnectorHint:
      'Diese Komponente wird standardmäßig mit "{name}" verknüpft. Sie können die Auswahl bei Bedarf anpassen.',
    serviceModeLabel: 'Service-Modus',
    serviceModeNewTitle: 'Neu deployen',
    serviceModeNewDescription:
      'Der Service wird als neue Komponente im Dashboard erfasst.',
    serviceModeExistingTitle: 'Bestehenden Service verbinden',
    serviceModeExistingDescription:
      'Nutzen Sie einen bereits laufenden DTR- oder Submodel-Service.',
    existingServiceUrlLabel: 'Bestehende Service-URL',
    existingServiceUrlPlaceholderSubmodel: 'https://submodel.example.com',
    existingServiceUrlPlaceholderTwin: 'https://registry.example.com',
    credentialsApiKeyLabel: 'Credentials / API Key',
    optionalAccessValuePlaceholder: 'Optionaler Zugriffswert',
    validationRequired: 'Bitte geben Sie {field} ein.',
    validationInvalidUrl:
      'Geben Sie eine gültige URL beginnend mit http:// oder https:// ein.',
    connectorTypeDefault: 'EDC Connector',
    noConnectorsForComponents:
      'Erstellen Sie zuerst mindestens einen EDC Connector, bevor Sie Komponenten oder Services hinzufügen.',
    connectorsSectionSubtitle: 'Ihre Eclipse-Dataspace-Connectors',
    componentsSectionSubtitle:
      'Submodel Services, Digital Twin Registries und weitere Services',
    tableName: 'Name',
    tableVersion: 'Version',
    tableType: 'Typ',
    tableStatus: 'Status',
    tableEndpoint: 'Endpoint',
    tableActions: 'Aktionen',
    tableLinkedTo: 'Verknüpft mit',
    tableManage: 'Verwalten',
    tableDelete: 'Löschen',
    tableMore: 'Weitere Optionen',
    statusActive: 'Aktiv',
    statusInactive: 'Inaktiv',
    statusHealthy: 'Healthy',
    noConnectorsTitle: 'Noch keine EDC Connectors',
    noConnectorsDescription: 'Klicken Sie auf "Add+", um Ihren ersten Connector bereitzustellen.',
    noComponentsTitle: 'Noch keine Komponenten oder Services',
    noComponentsDescription:
      'Fügen Sie eine Komponente hinzu und verknüpfen Sie sie mit einem Ihrer Connectoren.',
    help: 'Help',
    helpSupport: 'Hilfe & Support',
    helpDescription:
      'Hier finden Sie die wichtigsten Einstiegs- und Supportmöglichkeiten für das Dashboard.',
    helpFaq: 'FAQs',
    helpDocs: 'Dokumentation',
    helpTroubleshooting: 'Fehlerbehebung',
    helpContact: 'Support kontaktieren',
    sidebarMonitor: 'Monitor',
    sidebarApp: 'App',
    datasourceSettings: 'Datasource Settings',
    languageEnglish: 'EN',
    languageGerman: 'DE',
    helpButton: 'Hilfe öffnen',
    userAdministrator: 'Administrator',
    monitorTitle: 'Monitor',
    monitorComingSoon: 'System-Monitoring folgt in Kürze...',
    settingsTitle: 'Dataspace Settings',
    settingsLoading: 'Einstellungen werden geladen...',
    settingsDescription:
      'Diese Dataspace- und Plattform-Einstellungen werden hier nur zur Referenz angezeigt und können nicht bearbeitet werden.',
    footerCopyright: 'Lizenzen: Apache-2.0 (Code) | CC-BY-4.0 (Nicht-Code)',
    deleteConnectorTitle: 'Connector löschen',
    deleteConnectorMessage:
      'Möchten Sie "{name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    deleteComponentTitle: 'Komponente löschen',
    deleteComponentMessage:
      'Möchten Sie "{name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    confirmDelete: 'Löschen',
    close: 'Schließen',
    details: 'Details',
    noValue: 'N/V',
    reopenHelp: 'Onboarding-Hilfe öffnen',
    reopenGuideButton: 'Onboarding öffnen',
    dataspaceFallback: 'Loading...',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, variables?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage === 'en' || storedLanguage === 'de') {
      setLanguageState(storedLanguage);
      return;
    }

    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith('de')) {
      setLanguageState('de');
    }
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, variables) => {
        let text: string = translations[language][key];
        if (!variables) {
          return text;
        }

        for (const [variable, value] of Object.entries(variables)) {
          text = text.replace(`{${variable}}`, value);
        }

        return text;
      },
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}
