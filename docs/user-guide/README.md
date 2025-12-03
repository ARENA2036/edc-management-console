# User Manual

## Table of contents
-   [Getting started](#getting-started)
    -   [Accessing the app](#accessing-the-app)
        - [Login](#login)
        - [Logout](#logout)
    -   [Navigation: Manage Your Connectors](#navigation-manage-your-connectors)
    -   [Skip Deploy EDC Connector steps](#skip-deploy-edc-connector-steps)
    -   [Dataspace Settings Option](#dataspace-settings-option)
    -   [SDE Option](#sde-option)

## Getting started
### Accessing the app
EMC can be accessed via a web browser.

## Login
1. Go to emc application url
    - Click on below url
    - https://emc-1-txcd.arena2036-x.de/

![alt text](images/emc-application.png)

2. Select your company from the list or search by typing its name

![alt text](images/select-company.png)

3. You will be redirected to your company's Keycloak login page

![alt text](images/company-Keycloak-login.png)

4. Enter your credentials (username/email and password)
-   Click Sign In

![alt text](images/enter-username-password.png)

5. You will be redirected EMC dashboard

![alt text](images/dashboard.png)

## Logout

1. In the header, click on the user icon at the top-right corner
2. Click Logout
3. You will be redirected back to the login page

![alt text](images/logout.png)

## Navigation: Manage Your Connectors

You can manage and deploy EDC connectors through a guided 4‑step process.

**1. Navigate to the Add Connector button**
- Click Add Connector 

![alt text](images/add-connector.png)

**2. Step 1 - Deploy EDC Connector**
- Enter the Submodel Service
- Submodel Hostname automatically populated after entering the Submodel Service
- Click Next

![alt text](images/step1.png)

**3. Step 2 - Digital Twin Registry**
- Enter the Registry Name
- Registry Hostname automatically populated after entering the Registry Name
- Click Next

![alt text](images/step2.png)

**4. Step 3 - EDC Deployment Configuration**
Fill in the fields shown in the screenshot:
- EDC Name
- EDC Version (Options: 0.9.0 or 0.10.2 — select one)
- Endpoint Hostname (automatically populated after entering the EDC Name)
- Business Partner Number (BPN)
- Username
- password
You can also preview and copy the auto‑generated YAML using the Copy YAML option
- Click Next

![alt text](images/step3.png)

**5. Step 4 - Deploy EDC Connector**
- If you want to review your inputs, click Previous.
- After verifying the details, click Deploy EDC.
- Once deployed, the connector will appear under Manage Your Connectors.

![alt text](images/step4.png)

**6. Manage Your Connectors**
-   When a connector is added, the initial status may appear as Disconnected. This happens because the backend performs a series to check API calls to verify the connector’s availability. The system checks the liveness and readiness endpoints of the EDC.
-   If all required EDC services are up and running, the status automatically updates to Connected, as shown in the screenshot below.

![alt text](images/manage-your-connectors-disconnected.png)

EDC services are up and running and the status is Connected
![alt text](images/manage-your-connectors-connected.png)

## Skip Deploy EDC Connector steps
- On the Deploy EDC Connector screen, you can click Skip to skip a step and move to the next one.

![alt text](images/skip-button.png)

# Dataspace Settings Option

The Dataspace Settings page displays configuration values that are automatically synchronized from Keycloak.

## General Information

- Dataspace Name
    - Name of the dataspace environment you are operating in.
    - Example: ARENA2036-X

- BPN Number
    - The Business Partner Number associated with your organization.
    - Example: BPNL00000003CRHK

- Realm
    - The Keycloak realm under which your user and identity settings are managed.
    - Example: ARENA2036-X

- Username
    - The username of the account currently logged into EMC.
    - Example: user

## Identity Provider
Information about the identity provider configured for your organization.

- Central IDP URL
    - URL of the Central Identity Provider used for authentication.
    - Example: https://centralidp-txcd.arena2036-x.de/auth/

- Portal URL
    - Link to the associated dataspace portal.
    - Example: https://portal-txcd.arena2036-x.de

## Discovery Services

- Semantics URL
    - URL for the semantics service used for ontology and semantic model lookups.
    - Example: https://semantics-txcd.arena2036-x.de

- Discovery Finder Endpoint
    - Endpoint for connector discovery within the dataspace.
    - Example: /discoveryfinder/api/v1.0/administration/connectors/discovery/search

- BPN Discovery Endpoint
    - Endpoint for discovering connectors based on BPN.
    - Example: /bpndiscovery/api/v1.0/administration/connectors/bpnDiscovery/search

## SDE Configuration

- SDE URL
    - The base URL for accessing the Simple Data Exchanger (SDE) application.
    - Example: https://sde-1-txcd.arena2036-x.de

- SDE Client ID
    - The client identifier used by the SDE to authenticate with the identity provider.
    - Example: SDE-1

- Provider EDC
    - The default EDC (Eclipse Dataspace Connector) endpoint used by the SDE for data exchange operations.
    - Example: https://emc-edc-1-controlplane-txcd.arena2036-x.de

## EDC Configuration

- Default EDC URL
    - The preconfigured default EDC Control Plane URL for your organization.
    - Example: https://emc-edc-1-controlplane-txcd.arena2036-x.de

- Cluster Context
  - The Kubernetes cluster context used for EDC deployments and operations.
  - Example: arena2036_txcd

![alt text](images/dataspace-setting.png)

# SDE Option
When you click on the SDE option it will redirect to the Simple Data Exchanger application automatically.
- If you need more information, visit the following link:
- [Simple Data Exchanger User Guide](https://github.com/ARENA2036/managed-simple-data-exchanger-frontend/blob/main/docs/user-guide/README.md)

![alt text](images/SDE.png)

# Known Issues

- In the application, there are some known issues that may affect certain functionalities. These issues have already been identified and will be resolved in future updates.
- These issues do not affect the core functionality and are being actively monitored and improved in upcoming releases.