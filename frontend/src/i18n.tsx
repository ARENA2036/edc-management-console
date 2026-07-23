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
    connectorNamePlaceholder: 'test-connector',
    connectorNameHelp:
      'Use lowercase letters, numbers and hyphens so your team can identify the connector quickly.',
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
    componentNamePlaceholderSubmodel: 'Submodel Service EU-1',
    componentNamePlaceholderTwin: 'Digital Twin Registry EU-1',
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
    datasourceSettings: 'Dataspace Settings',
    languageEnglish: 'EN',
    languageGerman: 'DE',
    helpButton: 'Open help',
    themeSwitchToLight: 'Switch to light mode',
    themeSwitchToDark: 'Switch to dark mode',
    userAdministrator: 'Administrator',
    userFallback: 'User',
    monitorTitle: 'Monitor',
    monitorComingSoon: 'System monitoring is coming soon...',
    settingsTitle: 'Dataspace Settings',
    settingsLoading: 'Loading settings...',
    settingsDescription:
      'These dataspace and platform settings are shown for reference and cannot be modified here.',
    footerCopyright: 'Licenses: Apache-2.0 (code) | CC-BY-4.0 (non-code)',
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
    logout: 'Logout',
    yes: 'Yes',
    no: 'No',
    readOnly: 'Read only',
    viewOnly: 'View only',
    appTitle: 'EDC Management Console',
    appTitleShort: 'EDC Console',
    dashboardTooltipTitle: 'Open dashboard',
    dashboardTooltipContent:
      'This is the main workspace where users review status cards, connectors, components and the fastest path to create new items.',
    dashboardTooltipFooter:
      'Start here when you want the clearest overview of the system.',
    monitorTooltipTitle: 'Open monitoring',
    monitorTooltipContent:
      'This area is intended for operational visibility, health checks and live system tracking.',
    monitorTooltipFooter:
      'Useful after deployment when you want to verify that integrations remain healthy.',
    sdeNavLabel: 'SDE',
    sdeNavTitle: 'Simple Data Exchanger',
    sdeNavContent:
      'Opens the connected SDE application when users want to continue from the console into an exchange workflow.',
    sdeNavFooter:
      'If this does not open, check the SDE URL in Dataspace Settings first.',
    portalNavLabel: 'Portal',
    portalNavTitle: 'Portal entry',
    portalNavContent:
      'Reserved navigation entry for a portal or broader business-facing application around the dataspace.',
    portalNavFooter:
      'This can later point to a real portal without changing the navigation pattern.',
    dataspaceOsNavLabel: 'Industry Core Hub',
    dataspaceOsNavTitle: 'Industry Core Hub',
    dataspaceOsNavContent:
      'Entry point for Industry Core Hub and related platform workflows in the dataspace environment.',
    dataspaceOsNavFooter:
      'Useful when teams need access to companion platform applications from one console.',
    guideReopenTitle: 'Reopen the guide',
    guideReopenContent:
      'Opens the onboarding guide again so users can get step-by-step help whenever they need it.',
    documentationLabel: 'Documentation',
    documentationTitle: 'Repository & documentation',
    documentationContent:
      'Opens the application repository with the README, project context and supporting information.',
    troubleshootingLabel: 'Troubleshooting',
    troubleshootingTitle: 'Troubleshooting',
    troubleshootingContent:
      'Opens the repository issues page to review known problems and possible fixes.',
    contactSupportLabel: 'Contact support',
    contactSupportTitle: 'Contact support',
    contactSupportContent:
      'Starts an email support request when the user needs direct help from the responsible team.',
    settingsTooltipTitle: 'Dataspace Settings',
    settingsTooltipContent:
      'This page shows synchronized dataspace and platform information that often serves as a reference for URLs, environments and system values.',
    settingsTooltipFooter: 'View only',
    portalPlaceholderDescription:
      'This application entry is ready for a portal integration and can later be connected to a real portal URL or embedded portal experience.',
    dataspaceOsPlaceholderDescription:
      'This application entry opens Industry Core Hub and related platform-oriented workflows.',
    sdeRedirectTitle: 'Redirecting to SDE Application...',
    sdeRedirectDescription:
      'You will be redirected to the Simple Data Exchanger application.',
    sdeRedirectLinkPrefix: 'If you are not redirected,',
    sdeRedirectLinkLabel: 'click here',
    sdeRedirectLinkSuffix: '.',
    bpnLabel: 'BPNL',
    bpnPlaceholder: 'BPNL000000000000',
    bpnHelp: 'Use a valid business partner number in BPNL format.',
    bpnPrefilledHelp:
      'This BPNL was detected automatically from your login or dataspace information. You can still adjust it if needed.',
    versionLabel: 'Version',
    deploymentPreparationWelcome:
      'Before you start, it helps to have the connector name, BPNL and technical endpoints ready.',
    deploymentPreparationCredentials:
      'Users usually get these values from the platform team, dataspace onboarding docs, Kubernetes or ingress configuration, or existing operations documentation.',
    deploymentPreparationExample:
      'Example: for an EDC connector, you will usually need the public API endpoint and the data plane address maintained by your infrastructure or DevOps team.',
    deploymentEndpointFollowup:
      'If you do not know these URLs yet, ask for the ingress, gateway or service addresses for the control plane and the data plane.',
    deploymentConnectorOnlyInfo:
      'You are deploying only the EDC connector here. DTR or Submodel Services can be added afterwards as components or connected as existing services.',
    deploymentAutoConfigTitle: 'BPNL and endpoints are filled automatically.',
    deploymentAutoConfigDescription:
      'The wizard reads the BPNL and EDC endpoint values directly from the backend dataspace configuration, so users only need to enter a connector name.',
    deployAndAddComponent: 'Deploy & add component',
    componentGuidanceChoose:
      'Choose the service type based on its job: Submodel Service for asset data or Digital Twin Registry for registration functions.',
    componentGuidanceConfig:
      'For the setup you usually need an existing connector plus the name or service URL from your project or operations documentation.',
    componentGuidanceWhere:
      'These values often come from the service owner, Helm or Kubernetes values, API documentation or your platform wiki.',
    componentGuidanceRestriction:
      'Services are linked only after the EDC deployment. Choose an existing connector first and then decide whether to deploy a new service or connect an existing one.',
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
    validationInvalidBpn:
      'Use the format BPNL followed by 12 letters or numbers.',
    validationInvalidConnectorName:
      'Use only lowercase letters, numbers and hyphens. The name must start and end with a letter or number.',
    validationInvalidUrl:
      'Enter a valid URL starting with http:// or https://.',
    connectorTypeDefault: 'EDC Connector',
    connectorAddComponentTooltip:
      'Add a new component or connect an existing service for this connector.',
    connectorDeleteTooltipWithComponents:
      'Deletes the connector. {count} linked component(s) will also be removed from the dashboard overview afterwards.',
    connectorDeleteTooltipWithoutComponents:
      'Deletes the connector from the dashboard and uninstalls the related deployment from the cluster.',
    connectorDeleteIntro: 'Do you really want to delete "{name}"?',
    connectorDeleteBody:
      'This removes the connector from the dashboard and uninstalls the related Helm deployment from the cluster.',
    connectorDeleteLinkedComponents:
      '{count} linked component(s) will also be removed from the dashboard overview afterwards so no broken references remain.',
    componentModeLabel: 'Mode',
    componentModeExisting: 'Existing service',
    componentModeNew: 'New deployment',
    deployedLabel: 'Deployed',
    deleteComponentFollowup:
      'The component will be removed from the dashboard overview. If it was already connected technically, please review the related target environment or service configuration afterwards.',
    deleteComponentTooltip:
      'Deletes this component from the dashboard overview after confirmation.',
    statusNoCheckYet: 'No check yet',
    statusWarning: 'Warning',
    statusCritical: 'Critical',
    statusUnknown: 'Unknown',
    statusNotice: 'Notice',
    statusOkay: 'OK',
    statsDataSpaceTitle: 'Understand the data space',
    statsDataSpaceContent:
      'This card shows the loaded dataspace name and often the main identifier for the environment you are working in.',
    statsDataSpaceFooter:
      'If values are missing here, check Dataspace Settings or the central platform configuration.',
    statsHealthTitle: 'Read system health',
    statsHealthContent:
      'Users can quickly see whether the console and its connected capabilities appear generally healthy.',
    statsHealthFooter:
      'Use this as a first orientation point before diving into connectors or services.',
    statsActivityTitle: 'Follow activity',
    statsActivityContent:
      'This card helps users understand whether logs, synchronization or background processes are currently active.',
    statsActivityFooter:
      'If something looks unusual, compare the activity state with the tables below.',
    statsConnectorsTitle: 'Connector overview',
    statsConnectorsContent:
      'Shows how many EDC connectors are currently known and how many appear active.',
    statsConnectorsFooter:
      'A strong starting point for non-technical users: check this card first, then use Add+ if you need a new connector.',
    statsAddTitle: 'Create something new',
    statsAddContent:
      'After clicking, the app asks whether you want an EDC connector or a component/service, then guides you step by step through the required information.',
    statsAddItemConnector:
      'EDC Connector: use when you want to deploy a new data exchange instance.',
    statsAddItemComponent:
      'Component / Service: use when you want to attach a business or platform service to an existing connector.',
    statsAddItemValues:
      'Values such as URLs or credentials usually come from platform docs, the DevOps team, or the service owner.',
    statsAddFooter:
      'If you are unsure, start with a connector first and add components afterwards.',
    addButtonLabel: 'ADD',
    monitorDescription:
      'Monitor connectors, linked services, recent activity and recommended next steps in one operational view.',
    statusOverallHealthTitle: 'Overall health',
    statusOverallHealthSubtitle:
      'Combines connector, service and warning state',
    statusHealthyConnectorsTitle: 'Healthy connectors',
    statusHealthyConnectorsSubtitle:
      'Connectors in healthy or active state',
    statusLinkedServicesTitle: 'Linked services',
    statusLinkedServicesSubtitle:
      'Services with an available connector and usable setup',
    statusRecentEventsTitle: 'Recent events',
    statusRecentEventsSubtitleBackend:
      'Loaded directly from backend activity logs',
    statusRecentEventsSubtitleDerived:
      'Derived from known connector and component data',
    monitorConnectorHealthTitle: 'Connector health',
    monitorConnectorHealthDescription:
      'Status, responsiveness and dependencies of your EDC connectors.',
    tableLastCheck: 'Last check',
    tableServices: 'Services',
    tableNoConnectors: 'No connectors available yet.',
    monitorServiceHealthTitle: 'Service health',
    monitorServiceHealthDescription:
      'Overview of DTR and submodel services and how they are linked to connectors.',
    tableNoServices: 'No linked services available yet.',
    recommendationsTitle: 'Recommendations',
    recentActivityTitle: 'Recent activity',
    eventActivityTitle: 'Activity',
    eventBackendActivityRecorded: 'Backend activity was recorded.',
    eventConnectorAvailable: 'Connector available: {name}',
    eventConnectorAvailableHealthy:
      'The connector is known in the dashboard and can be used for additional services.',
    eventConnectorAvailableUnhealthy:
      'The last known state is critical. Check endpoint and platform reachability.',
    eventComponentLinked: 'Component linked: {name}',
    eventComponentLinkedBody: '{type} is linked to {connector}.',
    recommendationUnhealthyConnectors:
      '{count} connector(s) report a critical state. Check endpoint and cluster reachability first.',
    recommendationConnectorsWithoutServices:
      '{count} connector(s) do not have a linked service yet. If you want to work with DTR or a Submodel Service, you can add a component now or connect an existing service.',
    recommendationDetachedComponents:
      '{count} component(s) reference a missing connector. Clean them up or relink them.',
    recommendationNoConnectors:
      'There are no connectors yet. Start with ADD and deploy your first EDC connector.',
    recommendationStable:
      'Your monitored resources currently look stable. Use monitoring for regular checks and trend observation.',
    monitorNoActivity: 'No activity data available yet.',
    settingsReadonlyNotice:
      'These values are shown as a reference for your dataspace. The page is intentionally read-only so central platform settings cannot be changed accidentally.',
    settingsSectionDataspace: 'Dataspace overview',
    settingsSectionAccess: 'Access and identity',
    settingsSectionApps: 'Connected applications',
    settingsSectionDiscovery: 'Discovery and semantics',
    settingsSectionInfrastructure: 'Infrastructure',
    settingsLabelDataspace: 'Dataspace',
    settingsLabelBpn: 'BPNL',
    settingsLabelRealm: 'Realm',
    settingsLabelReadonly: 'Read only',
    settingsLabelDefaultUsername: 'Default username',
    settingsLabelCentralIdpUrl: 'Central IDP URL',
    settingsLabelCentralIdpRealm: 'Central IDP realm',
    settingsLabelSsiWalletUrl: 'SSI wallet URL',
    settingsLabelPortalUrl: 'Portal URL',
    settingsLabelSdeUrl: 'SDE URL',
    settingsLabelSdeClientId: 'SDE Client ID',
    settingsLabelManufacturerId: 'Manufacturer ID',
    settingsLabelSemanticsUrl: 'Semantics URL',
    settingsLabelDiscoveryFinder: 'Discovery finder',
    settingsLabelBpnDiscovery: 'BPN discovery',
    settingsLabelDefaultEdcUrl: 'Default EDC URL',
    settingsLabelClusterContext: 'Cluster context',
    settingsLabelProviderEdc: 'Provider EDC',
    settingsLabelConsumerEdc: 'Consumer EDC',
    settingsLabelRegistryUrl: 'Registry URL',
    onboardingWelcomeTitle: 'Welcome to the EDC Management Console!',
    onboardingWelcomeSubtitle:
      'Manage your EDC connectors and monitor your data flows in real-time.',
    onboardingOverviewTitle: 'Dashboard Overview',
    onboardingOverviewSubtitle: 'Understand the main areas of your dashboard.',
    onboardingGettingStartedTitle: 'Getting Started',
    onboardingGettingStartedSubtitle: 'How to deploy your first EDC connector.',
    onboardingSupportTitle: 'Help & Support',
    onboardingSupportSubtitle: 'We are here to help you.',
    onboardingWelcomeIntro:
      'This guide will walk you through the main features of the console and show you how to get started.',
    onboardingCanDoTitle: 'What you can do here:',
    onboardingCanDoItem1: 'Create, manage and monitor EDC connectors',
    onboardingCanDoItem2:
      'Track system health and connector status in real-time',
    onboardingCanDoItem3: 'Monitor synchronization and API activities',
    onboardingCanDoItem4:
      'Export reports and share updates with your team',
    onboardingOverviewStatusCardsTitle: 'Status Cards (Top)',
    onboardingOverviewStatusCardsBody:
      'Shows key metrics like data space, system health, activity status and connector count with real-time updates.',
    onboardingOverviewConnectorTableTitle: 'Connectors Table (Center)',
    onboardingOverviewConnectorTableBody:
      'Overview of all EDC connectors with status, version, endpoint and quick actions.',
    onboardingOverviewNavigationTitle: 'Navigation (Left)',
    onboardingOverviewNavigationBody:
      'Quick access to Dashboard, Monitor, App and Dataspace Settings.',
    onboardingStep1Title: 'Add EDC Connector',
    onboardingStep1Body:
      'Click the orange "Add+" button to create a new connector.',
    onboardingStep2Title: 'Complete Deployment Wizard',
    onboardingStep2Body:
      'Follow the step-by-step wizard to configure your connector with clear descriptions for each step.',
    onboardingStep3Title: 'Monitor Status',
    onboardingStep3Body:
      'Track your connector status in the table and receive notifications for any issues.',
    onboardingTipBody:
      'Hover over buttons and icons to see tooltips with additional information.',
    onboardingSupportIntro:
      'If you have questions while using the console:',
    onboardingSupportInlineTitle: 'Use Inline Help',
    onboardingSupportInlineBody:
      'Tooltips and contextual help are available throughout the application. Hover over elements to learn more.',
    onboardingSupportConfirmTitle: 'Pay Attention to Confirmations',
    onboardingSupportConfirmBody:
      'Important actions require confirmation, so you always know what will happen before changes are made.',
    onboardingSupportResponsiveTitle: 'Works Across Screen Sizes',
    onboardingSupportResponsiveBody:
      'The interface is designed for desktop, zoom levels and mobile layouts so your workflow stays stable.',
    onboardingReadyTitle: 'Ready to get started?',
    onboardingReadyBody:
      'You can reopen this guide anytime through the help button or from settings.',
    onboardingStepCounter: 'Step {current} of {total}',
    connectedApplicationsTitle: 'Connected applications',
    connectorMissing: 'Connector missing',
    connectorNeedsReview: 'Needs review',
    connectorReady: 'Ready',
    deployedInsideConnector: 'Deployed inside connector',
    monitorConnectorCritical: 'Critical',
    monitorConnectorActive: 'Active',
    appDataSpaceInfoTitle: 'Data Space Information',
    appSystemHealthInfoTitle: 'System health',
    appActivityInfoTitle: 'Activity',
    appConnectorOverviewInfoTitle: 'Connector overview',
    appCreateNewInfoTitle: 'Create something new',
  },
  de: {
    dashboard: 'Dashboard',
    welcome: 'Willkommen in Ihrer EDC Management Console',
    dataSpace: 'Data Space',
    systemHealth: 'System-Status',
    activity: 'Aktivität',
    edcConnectors: 'EDC-Connectoren',
    componentsServices: 'Komponenten & Services',
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
    connectorNamePlaceholder: 'test-connector',
    connectorNameHelp:
      'Verwenden Sie Kleinbuchstaben, Zahlen und Bindestriche, damit Ihr Team den Connector schnell erkennt.',
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
    componentNamePlaceholderSubmodel: 'Submodel Service EU-1',
    componentNamePlaceholderTwin: 'Digital Twin Registry EU-1',
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
    statusHealthy: 'Gesund',
    noConnectorsTitle: 'Noch keine EDC Connectors',
    noConnectorsDescription: 'Klicken Sie auf "Add+", um Ihren ersten Connector bereitzustellen.',
    noComponentsTitle: 'Noch keine Komponenten oder Services',
    noComponentsDescription:
      'Fügen Sie eine Komponente hinzu und verknüpfen Sie sie mit einem Ihrer Connectoren.',
    help: 'Hilfe',
    helpSupport: 'Hilfe & Support',
    helpDescription:
      'Hier finden Sie die wichtigsten Einstiegs- und Supportmöglichkeiten für das Dashboard.',
    helpFaq: 'FAQs',
    helpDocs: 'Dokumentation',
    helpTroubleshooting: 'Fehlerbehebung',
    helpContact: 'Support kontaktieren',
    sidebarMonitor: 'Monitor',
    sidebarApp: 'App',
    datasourceSettings: 'Dataspace-Einstellungen',
    languageEnglish: 'EN',
    languageGerman: 'DE',
    helpButton: 'Hilfe öffnen',
    themeSwitchToLight: 'Zum hellen Modus wechseln',
    themeSwitchToDark: 'Zum dunklen Modus wechseln',
    userAdministrator: 'Administrator',
    userFallback: 'Benutzer',
    monitorTitle: 'Monitoring',
    monitorComingSoon: 'System-Monitoring folgt in Kürze...',
    settingsTitle: 'Dataspace-Einstellungen',
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
    noValue: 'k. A.',
    reopenHelp: 'Onboarding-Hilfe öffnen',
    reopenGuideButton: 'Onboarding öffnen',
    dataspaceFallback: 'Wird geladen...',
    logout: 'Abmelden',
    yes: 'Ja',
    no: 'Nein',
    readOnly: 'Schreibgeschützt',
    viewOnly: 'Nur anzeigen',
    appTitle: 'EDC Management Console',
    appTitleShort: 'EDC Console',
    dashboardTooltipTitle: 'Dashboard öffnen',
    dashboardTooltipContent:
      'Hier sehen Nutzer Kennzahlen, Connectoren, Komponenten und den schnellsten Einstieg zum Hinzufügen neuer Elemente.',
    dashboardTooltipFooter:
      'Starten Sie hier, wenn Sie den nächsten sinnvollen Schritt im System suchen.',
    monitorTooltipTitle: 'Monitoring anzeigen',
    monitorTooltipContent:
      'Dieser Bereich ist für Zustände, Betriebsüberwachung und spätere Live-Sicht auf Integrationen gedacht.',
    monitorTooltipFooter:
      'Hilfreich, wenn Sie nach dem Deployment Systemzustände prüfen möchten.',
    sdeNavLabel: 'SDE',
    sdeNavTitle: 'Simple Data Exchanger',
    sdeNavContent:
      'Öffnet die angebundene SDE-Anwendung. Nutzen Sie diesen Eintrag, wenn Sie nach der Einrichtung in den eigentlichen Datenaustausch wechseln möchten.',
    sdeNavFooter:
      'Falls nichts geöffnet wird, prüfen Sie zuerst die SDE-URL in den Dataspace-Einstellungen.',
    portalNavLabel: 'Portal',
    portalNavTitle: 'Portal-Einstieg',
    portalNavContent:
      'Reservierter Einstiegspunkt für ein Portal oder eine fachliche Oberfläche rund um Ihren Dataspace.',
    portalNavFooter:
      'Die Struktur ist bereits da und kann später mit einer echten Portal-Integration verbunden werden.',
    dataspaceOsNavLabel: 'Industry Core Hub',
    dataspaceOsNavTitle: 'Industry Core Hub',
    dataspaceOsNavContent:
      'Einstiegspunkt für den Industry Core Hub und verwandte plattformbezogene Workflows im Dataspace-Kontext.',
    dataspaceOsNavFooter:
      'Nützlich, wenn Teams begleitende Plattform-Anwendungen aus derselben Navigation heraus erreichen sollen.',
    guideReopenTitle: 'Guide erneut öffnen',
    guideReopenContent:
      'Öffnet den Einführungs-Guide erneut, damit Nutzer jederzeit Schritt-für-Schritt-Hilfe bekommen können.',
    documentationLabel: 'Dokumentation',
    documentationTitle: 'Repository & Dokumentation',
    documentationContent:
      'Öffnet das Git-Repository der Anwendung mit README, Projektkontext und weiterführenden Informationen.',
    troubleshootingLabel: 'Fehlerbehebung',
    troubleshootingTitle: 'Fehlerbehebung',
    troubleshootingContent:
      'Öffnet die Issues des Repositories, um bekannte Probleme und Lösungswege nachzuschlagen.',
    contactSupportLabel: 'Support kontaktieren',
    contactSupportTitle: 'Support kontaktieren',
    contactSupportContent:
      'Erstellt eine Support-Anfrage per E-Mail, wenn direkte Hilfe vom Team benötigt wird.',
    settingsTooltipTitle: 'Dataspace-Einstellungen',
    settingsTooltipContent:
      'Hier finden Sie synchronisierte Dataspace- und Plattforminformationen, die oft als Referenz für URLs, Umgebungen und Systemwerte dienen.',
    settingsTooltipFooter: 'Nur anzeigen',
    portalPlaceholderDescription:
      'Dieser Anwendungseintrag ist für eine Portal-Integration vorbereitet und kann später mit einer echten Portal-URL oder einer eingebetteten Portalerfahrung verbunden werden.',
    dataspaceOsPlaceholderDescription:
      'Dieser Anwendungseintrag öffnet den Industry Core Hub und verwandte plattformbezogene Workflows.',
    sdeRedirectTitle: 'Weiterleitung zur SDE-Anwendung...',
    sdeRedirectDescription:
      'Sie werden zur Simple-Data-Exchanger-Anwendung weitergeleitet.',
    sdeRedirectLinkPrefix: 'Falls Sie nicht weitergeleitet werden,',
    sdeRedirectLinkLabel: 'klicken Sie hier',
    sdeRedirectLinkSuffix: '.',
    bpnLabel: 'BPNL',
    bpnPlaceholder: 'BPNL000000000000',
    bpnHelp: 'Verwenden Sie eine gültige Business Partner Number im BPNL-Format.',
    bpnPrefilledHelp:
      'Diese BPNL wurde automatisch aus Ihrem Login oder den Dataspace-Informationen übernommen. Sie können sie bei Bedarf anpassen.',
    versionLabel: 'Version',
    deploymentPreparationWelcome:
      'Bevor Sie starten: Halten Sie idealerweise den gewünschten Connector-Namen, die BPNL und die technischen Endpoints bereit.',
    deploymentPreparationCredentials:
      'Benötigte Informationen finden Sie oft bei Ihrem Plattform-Team, im Dataspace-Onboarding, in Kubernetes-/Ingress-Konfigurationen oder in bestehenden Betriebsdokumenten.',
    deploymentPreparationExample:
      'Beispiel: Für einen EDC Connector benötigen Sie meist die öffentliche API-Adresse und die Data-Plane-Adresse, die Ihr Infrastruktur- oder DevOps-Team bereitstellt.',
    deploymentEndpointFollowup:
      'Wenn Sie diese URLs nicht kennen, fragen Sie nach Ingress-, Gateway- oder Service-Adressen für Control Plane und Data Plane.',
    deploymentConnectorOnlyInfo:
      'Sie deployen hier nur den EDC Connector. DTR oder Submodel Services können Sie danach gezielt als Komponente hinzufügen oder mit bestehenden Services verbinden.',
    deploymentAutoConfigTitle: 'BPNL und Endpoints werden automatisch gesetzt.',
    deploymentAutoConfigDescription:
      'Der Wizard liest die BPNL und die EDC-Endpunkte direkt aus der Dataspace-Konfiguration des Backends. Der Nutzer muss deshalb nur noch einen Connector-Namen angeben.',
    deployAndAddComponent: 'Deployen & Komponente hinzufügen',
    componentGuidanceChoose:
      'Wählen Sie den Service-Typ nach seiner Aufgabe: Submodel Service für Asset-Daten oder Digital Twin Registry für Registrierungsfunktionen.',
    componentGuidanceConfig:
      'Für die Verknüpfung benötigen Sie normalerweise den passenden Connector sowie den Namen oder die URL des Zielservices aus Ihrer Betriebs- oder Projekt-Dokumentation.',
    componentGuidanceWhere:
      'Diese Informationen kommen häufig vom Service-Verantwortlichen, aus Helm-/Kubernetes-Werten, API-Dokumentation oder aus Ihrem Plattform-Wiki.',
    componentGuidanceRestriction:
      'Services werden erst nach dem EDC-Deployment verknüpft. Wählen Sie also zuerst einen bestehenden Connector als Basis aus.',
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
    validationInvalidBpn:
      'Verwenden Sie das Format BPNL gefolgt von 12 Buchstaben oder Ziffern.',
    validationInvalidConnectorName:
      'Verwenden Sie nur Kleinbuchstaben, Zahlen und Bindestriche. Der Name muss mit einem Buchstaben oder einer Zahl beginnen und enden.',
    validationInvalidUrl:
      'Geben Sie eine gültige URL beginnend mit http:// oder https:// ein.',
    connectorTypeDefault: 'EDC Connector',
    connectorAddComponentTooltip:
      'Neue Komponente hinzufügen oder einen bestehenden Service für diesen Connector verbinden.',
    connectorDeleteTooltipWithComponents:
      'Löscht den Connector. {count} verknüpfte Komponente(n) werden anschließend ebenfalls aus der Dashboard-Übersicht entfernt.',
    connectorDeleteTooltipWithoutComponents:
      'Löscht den Connector aus dem Dashboard und deinstalliert die zugehörige Deployment-Instanz im Cluster.',
    connectorDeleteIntro: 'Möchten Sie "{name}" wirklich löschen?',
    connectorDeleteBody:
      'Dadurch wird der Connector aus dem Dashboard entfernt und die zugehörige Helm-Deployment-Instanz im Cluster deinstalliert.',
    connectorDeleteLinkedComponents:
      '{count} verknüpfte Komponente(n) werden anschließend ebenfalls aus der Dashboard-Übersicht entfernt, damit keine ungültigen Verknüpfungen zurückbleiben.',
    componentModeLabel: 'Modus',
    componentModeExisting: 'Bestehender Service',
    componentModeNew: 'Neues Deployment',
    deployedLabel: 'Deployt',
    deleteComponentFollowup:
      'Die Komponente wird aus der Dashboard-Übersicht entfernt. Falls sie bereits technisch angebunden wurde, prüfen Sie bitte anschließend die zugehörige Zielumgebung oder Service-Konfiguration.',
    deleteComponentTooltip:
      'Löscht diese Komponente nach Bestätigung aus der Dashboard-Übersicht.',
    statusNoCheckYet: 'Noch kein Check',
    statusWarning: 'Warnung',
    statusCritical: 'Kritisch',
    statusUnknown: 'Unbekannt',
    statusNotice: 'Hinweis',
    statusOkay: 'Okay',
    statsDataSpaceTitle: 'Data-Space-Informationen',
    statsDataSpaceContent:
      'Diese Karte zeigt den aktuell geladenen Dataspace-Namen und oft die wichtigste Kennung für Ihre Umgebung.',
    statsDataSpaceFooter:
      'Wenn hier Werte fehlen, prüfen Sie die Dataspace-Einstellungen oder die zentrale Plattform-Konfiguration.',
    statsHealthTitle: 'System-Status verstehen',
    statsHealthContent:
      'Hier sehen Nutzer auf einen Blick, ob die Konsole und die verbundenen Funktionen grundsätzlich gesund erscheinen.',
    statsHealthFooter:
      'Nutzen Sie diese Karte als erste Orientierung, bevor Sie tiefer in Connectoren oder Services einsteigen.',
    statsActivityTitle: 'Aktivitäten verfolgen',
    statsActivityContent:
      'Diese Karte hilft zu erkennen, ob im Hintergrund Logs, Synchronisierung oder andere Prozesse stattfinden.',
    statsActivityFooter:
      'Wenn etwas unerwartet wirkt, vergleichen Sie die Aktivität mit den Tabellen darunter.',
    statsConnectorsTitle: 'Connector-Übersicht',
    statsConnectorsContent:
      'Zeigt, wie viele EDC Connectoren aktuell bekannt sind und wie viele davon aktiv wirken.',
    statsConnectorsFooter:
      'Ein guter Startpunkt für Nutzer ohne Technik-Erfahrung: erst hier prüfen, dann über Add+ neue Connectoren anlegen.',
    statsAddTitle: 'Neue Elemente anlegen',
    statsAddContent:
      'Nach dem Klick wählen Sie zwischen EDC Connector und Component/Service. Danach führt Sie ein Wizard Schritt für Schritt durch die benötigten Angaben.',
    statsAddItemConnector:
      'EDC Connector: sinnvoll, wenn Sie eine neue Datenaustausch-Instanz bereitstellen möchten.',
    statsAddItemComponent:
      'Component / Service: sinnvoll, wenn Sie einen bestehenden Connector um einen Fachservice ergänzen möchten.',
    statsAddItemValues:
      'Benötigte Werte wie URLs oder Zugangsdaten kommen oft aus Plattform-Dokumentation, vom DevOps-Team oder vom Service-Verantwortlichen.',
    statsAddFooter:
      'Wenn Sie unsicher sind, starten Sie mit einem Connector und verknüpfen Sie Services erst danach.',
    addButtonLabel: 'ADD',
    monitorDescription:
      'Überwachen Sie Connectoren, verknüpfte Services, letzte Aktivitäten und empfohlene nächste Schritte in einer Betriebsansicht.',
    statusOverallHealthTitle: 'Gesamtstatus',
    statusOverallHealthSubtitle:
      'Kombiniert Connector-, Service- und Warnungsstatus',
    statusHealthyConnectorsTitle: 'Aktive Connectoren',
    statusHealthyConnectorsSubtitle:
      'Connectoren mit gesundem oder aktivem Zustand',
    statusLinkedServicesTitle: 'Verknüpfte Services',
    statusLinkedServicesSubtitle:
      'Services mit vorhandenem Connector und nutzbarer Konfiguration',
    statusRecentEventsTitle: 'Letzte Ereignisse',
    statusRecentEventsSubtitleBackend:
      'Direkt aus dem Backend-Log geladen',
    statusRecentEventsSubtitleDerived:
      'Aus bekannten Connector- und Komponenten-Daten abgeleitet',
    monitorConnectorHealthTitle: 'Connector-Status',
    monitorConnectorHealthDescription:
      'Status, Reaktionsfähigkeit und Abhängigkeiten Ihrer EDC Connectoren.',
    tableLastCheck: 'Letzter Stand',
    tableServices: 'Services',
    tableNoConnectors: 'Noch keine Connectoren vorhanden.',
    monitorServiceHealthTitle: 'Service-Status',
    monitorServiceHealthDescription:
      'Überblick über DTR- und Submodel-Services sowie deren Verknüpfung zum Connector.',
    tableNoServices: 'Noch keine verknüpften Services vorhanden.',
    recommendationsTitle: 'Empfehlungen',
    recentActivityTitle: 'Letzte Aktivitäten',
    eventActivityTitle: 'Aktivität',
    eventBackendActivityRecorded: 'Backend-Aktivität wurde erfasst.',
    eventConnectorAvailable: 'Connector bereit: {name}',
    eventConnectorAvailableHealthy:
      'Der Connector ist im Dashboard bekannt und kann für weitere Services genutzt werden.',
    eventConnectorAvailableUnhealthy:
      'Der letzte bekannte Zustand ist kritisch. Prüfen Sie Endpoint und Plattform-Erreichbarkeit.',
    eventComponentLinked: 'Komponente verknüpft: {name}',
    eventComponentLinkedBody: '{type} ist mit {connector} verbunden.',
    recommendationUnhealthyConnectors:
      '{count} Connector(en) melden einen kritischen Zustand. Prüfen Sie Endpoint und Cluster-Erreichbarkeit zuerst.',
    recommendationConnectorsWithoutServices:
      '{count} Connector(en) haben noch keinen verknüpften Service. Falls Sie mit DTR oder Submodel Service arbeiten möchten, können Sie diese jetzt als Komponente hinzufügen oder einen bestehenden Service verbinden.',
    recommendationDetachedComponents:
      '{count} Komponente(n) verweisen auf einen fehlenden Connector. Bereinigen oder verknüpfen Sie diese erneut.',
    recommendationNoConnectors:
      'Es gibt noch keine Connectoren. Beginnen Sie mit ADD und deployen Sie Ihren ersten EDC Connector.',
    recommendationStable:
      'Ihre überwachten Ressourcen wirken aktuell stabil. Nutzen Sie Monitoring für regelmäßige Checks und Trendbeobachtung.',
    monitorNoActivity: 'Noch keine Aktivitätsdaten vorhanden.',
    settingsReadonlyNotice:
      'Diese Werte dienen als Referenz für Ihren Dataspace. Die Seite ist bewusst schreibgeschützt, damit zentrale Plattform-Einstellungen nicht versehentlich geändert werden.',
    settingsSectionDataspace: 'Dataspace-Übersicht',
    settingsSectionAccess: 'Zugangs- und Identitätsdaten',
    settingsSectionApps: 'Verbundene Anwendungen',
    settingsSectionDiscovery: 'Discovery & Semantik',
    settingsSectionInfrastructure: 'Infrastruktur',
    settingsLabelDataspace: 'Dataspace',
    settingsLabelBpn: 'BPNL',
    settingsLabelRealm: 'Realm',
    settingsLabelReadonly: 'Schreibgeschützt',
    settingsLabelDefaultUsername: 'Standard-Benutzer',
    settingsLabelCentralIdpUrl: 'Central IDP URL',
    settingsLabelCentralIdpRealm: 'Central IDP Realm',
    settingsLabelSsiWalletUrl: 'SSI Wallet URL',
    settingsLabelPortalUrl: 'Portal URL',
    settingsLabelSdeUrl: 'SDE URL',
    settingsLabelSdeClientId: 'SDE Client ID',
    settingsLabelManufacturerId: 'Hersteller-ID',
    settingsLabelSemanticsUrl: 'Semantik-URL',
    settingsLabelDiscoveryFinder: 'Discovery Finder',
    settingsLabelBpnDiscovery: 'BPN Discovery',
    settingsLabelDefaultEdcUrl: 'Standard EDC URL',
    settingsLabelClusterContext: 'Cluster-Kontext',
    settingsLabelProviderEdc: 'Provider EDC',
    settingsLabelConsumerEdc: 'Consumer EDC',
    settingsLabelRegistryUrl: 'Registry URL',
    onboardingWelcomeTitle: 'Willkommen in der EDC Management Console!',
    onboardingWelcomeSubtitle:
      'Verwalten Sie Ihre EDC Connectoren und überwachen Sie Ihre Datenflüsse in Echtzeit.',
    onboardingOverviewTitle: 'Dashboard-Überblick',
    onboardingOverviewSubtitle:
      'Verstehen Sie die wichtigsten Bereiche Ihres Dashboards.',
    onboardingGettingStartedTitle: 'Erste Schritte',
    onboardingGettingStartedSubtitle:
      'So stellen Sie Ihren ersten EDC Connector bereit.',
    onboardingSupportTitle: 'Hilfe & Support',
    onboardingSupportSubtitle:
      'Wir sind hier, wenn Sie Unterstützung brauchen.',
    onboardingWelcomeIntro:
      'Dieser Guide führt Sie durch die wichtigsten Funktionen der Konsole und zeigt Ihnen, wie Sie schnell loslegen können.',
    onboardingCanDoTitle: 'Was Sie hier tun können:',
    onboardingCanDoItem1:
      'EDC Connectoren erstellen, verwalten und überwachen',
    onboardingCanDoItem2:
      'System-Status und Connector-Status in Echtzeit verfolgen',
    onboardingCanDoItem3:
      'Synchronisierung und API-Aktivitäten im Blick behalten',
    onboardingCanDoItem4:
      'Berichte und Informationen mit Ihrem Team teilen',
    onboardingOverviewStatusCardsTitle: 'Statuskarten (oben)',
    onboardingOverviewStatusCardsBody:
      'Zeigt die wichtigsten Kennzahlen wie Data Space, System-Status, Aktivität und Connector-Anzahl mit aktuellen Updates.',
    onboardingOverviewConnectorTableTitle: 'Connector-Tabelle (Mitte)',
    onboardingOverviewConnectorTableBody:
      'Übersicht aller EDC Connectoren mit Status, Version, Endpoint und direkten Aktionen.',
    onboardingOverviewNavigationTitle: 'Navigation (links)',
    onboardingOverviewNavigationBody:
      'Schneller Zugriff auf Dashboard, Monitor, App und Dataspace-Einstellungen.',
    onboardingStep1Title: 'EDC Connector hinzufügen',
    onboardingStep1Body:
      'Klicken Sie auf die orangefarbene Schaltfläche "Add+", um einen neuen Connector anzulegen.',
    onboardingStep2Title: 'Deployment Wizard ausfüllen',
    onboardingStep2Body:
      'Folgen Sie dem geführten Wizard, um Typ und Endpoints Ihres Connectors zu konfigurieren.',
    onboardingStep3Title: 'Status überwachen',
    onboardingStep3Body:
      'Verfolgen Sie den Connector-Status in der Tabelle und reagieren Sie schnell auf Änderungen.',
    onboardingTipBody:
      'Fahren Sie mit der Maus über Buttons und Icons, um zusätzliche Hinweise per Tooltip zu sehen.',
    onboardingSupportIntro:
      'Wenn Sie Fragen bei der Nutzung der Konsole haben:',
    onboardingSupportInlineTitle: 'Inline-Hilfe nutzen',
    onboardingSupportInlineBody:
      'Tooltips und kontextbezogene Hinweise sind in der gesamten Anwendung verfügbar. Fahren Sie über Elemente, um mehr zu erfahren.',
    onboardingSupportConfirmTitle: 'Auf Bestätigungen achten',
    onboardingSupportConfirmBody:
      'Wichtige Aktionen erfordern eine Bestätigung, damit Sie immer wissen, was vor Änderungen passiert.',
    onboardingSupportResponsiveTitle: 'Flexibel auf allen Geräten',
    onboardingSupportResponsiveBody:
      'Die Oberfläche ist für Desktop, Zoomstufen und mobile Ansichten ausgelegt, damit Ihr Workflow stabil bleibt.',
    onboardingReadyTitle: 'Bereit loszulegen?',
    onboardingReadyBody:
      'Sie können diesen Guide jederzeit erneut über das Hilfesymbol oder die Einstellungen öffnen.',
    onboardingStepCounter: 'Schritt {current} von {total}',
    connectedApplicationsTitle: 'Verbundene Anwendungen',
    connectorMissing: 'Connector fehlt',
    connectorNeedsReview: 'Prüfung empfohlen',
    connectorReady: 'Bereit',
    deployedInsideConnector: 'Im Connector deployt',
    monitorConnectorCritical: 'Kritisch',
    monitorConnectorActive: 'Aktiv',
    appDataSpaceInfoTitle: 'Data-Space-Informationen',
    appSystemHealthInfoTitle: 'System-Status',
    appActivityInfoTitle: 'Aktivität',
    appConnectorOverviewInfoTitle: 'Connector-Übersicht',
    appCreateNewInfoTitle: 'Neue Elemente anlegen',
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
