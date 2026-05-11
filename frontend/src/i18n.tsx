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
    apiEndpointPlaceholder: 'https://api.example.com/edc',
    dataPlaneLabel: 'Data Plane URL',
    dataPlanePlaceholder: 'https://data.example.com',
    endpointHelp: 'These endpoints are used to display and manage the connector in the dashboard.',
    addComponent: 'Add component',
    componentTypeStep: 'Choose component type',
    componentConfigStep: 'Configure component',
    componentTypeLabel: 'Component type',
    componentTypeSubmodel: 'Submodel Service',
    componentTypeTwin: 'Digital Twin Registry',
    componentTypeCatalog: 'Data Catalog',
    componentNameLabel: 'Component name',
    componentNamePlaceholder: 'Submodel Service EU-1',
    linkedConnectorLabel: 'Link to EDC connector',
    linkedConnectorPlaceholder: 'Select a connector',
    componentHelp: 'Components are attached to an existing EDC connector so users understand the relationship.',
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
    footerCopyright: 'Copyright © ARENA2036 e.V.',
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
    componentNamePlaceholder: 'Submodel Service EU-1',
    linkedConnectorLabel: 'Mit EDC Connector verknüpfen',
    linkedConnectorPlaceholder: 'Connector auswählen',
    componentHelp:
      'Komponenten werden mit einem bestehenden EDC Connector verknüpft, damit die Beziehung im Dashboard klar bleibt.',
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
    footerCopyright: 'Copyright © ARENA2036 e.V.',
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
