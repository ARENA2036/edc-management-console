# EDC Management Console User Guide



## Overview

The EDC Management Console (EMC) is a browser-based workspace for deploying, reviewing, and managing Eclipse Dataspace Connector (EDC) instances in a Tractus-X style dataspace. It helps users create an EDC connector, attach optional services such as a Submodel Service or Digital Twin Registry, monitor the connector overview, and continue data exchange work in the Simple Data Exchanger (SDE).

The console uses Keycloak for user login and shows dataspace-specific information such as the organization BPNL, discovery services, SDE configuration, and default EDC settings.

## Contents

- [Access and Login](#access-and-login)
- [Logout](#logout)
- [Dashboard Navigation](#dashboard-navigation)
- [Deploy an EDC Connector](#deploy-an-edc-connector)
- [Add Components and Services](#add-components-and-services)
- [Connector and Component Status](#connector-and-component-status)
- [Status Reference](#status-reference)
- [Monitor Page](#monitor-page)
- [Dataspace Settings](#dataspace-settings)
- [SDE Integration](#sde-integration)
- [Short API Reference](#short-api-reference)
- [Known Issues](#known-issues)



## Access and Login

Open the EMC application URL in your browser. In a workshop or hosted environment, this URL is usually provided by the platform or workshop team.

On the company selection page, search for your company or tenant and select it. EMC then redirects you to the configured Keycloak login page for that organization.

![Select company](images/select-company-u.png)

Enter your username or email address and password in Keycloak.

![Login](images/login-u.png)

After a successful login, you are redirected to the EMC dashboard.

![Dashboard](images/dashboard.png)

## Logout

1. Use the logout action in the header at the top right of the application. 


![Logout](images/logout-u.png)

2. After logout, the Keycloak session is ended or you are redirected back to the login flow, depending on the environment configuration.

## Dashboard Navigation

The dashboard is the main workspace for the console. It contains summary cards, connector management, component management, and navigation to companion applications.

The main dashboard cards are:

- Data Space: shows the loaded dataspace name and BPNL.
- System Health: gives a high-level health indication for the console environment.
- Activity: shows whether recent activity or synchronization is available.
- EDC Connectors: shows how many connectors are known and how many are active.

The sidebar contains these main areas:

- Dashboard: connector and component overview.
- Monitor: operational and status-oriented view.
- App: links to SDE, Portal, and Dataspace OS entries.
- Help: onboarding guide, documentation, troubleshooting, and support links.
- Datasource Settings: read-only dataspace and integration settings.

## Deploy an EDC Connector

From the dashboard, click `ADD`. EMC asks whether you want to deploy an `EDC Connector` or add a `Component / Service`.

![Add item](images/add-connector.png)

Choose `EDC Connector` when you want to deploy a new data exchange connector instance.

### Connector Details

Enter the base connector information:

- Connector name: the name for the EDC instance.
- BPNL: the Business Partner Number for your organization. In some environments this is prefilled from Keycloak or dataspace settings.
- Version: select the connector version offered by your environment.

![Connector details](images/step1.png)

Use the BPNL provided by your onboarding, workshop, or platform team. The BPNL is used to identify the organization in dataspace interactions.

The Word document also shows component-oriented screens for Submodel Service and Digital Twin Registry configuration. These fields may appear in environments where the connector wizard includes optional service steps.

![Submodel service configuration](images/step2.png)

You can either complete the Submodel Server Server or Skip this step.


![Digital Twin Registry configuration](images/step3.png)

### Endpoints

Enter the connector endpoints requested by the wizard:

- API or control-plane endpoint.
- Data-plane endpoint.

These values usually come from the platform team, Kubernetes or ingress configuration, or existing operations documentation.

After entering the required values, deploy the connector. If you also want to add a Submodel Service or Digital Twin Registry directly afterwards, choose the deploy-and-add-component option when available.

## Add Components and Services

Components are attached to an existing EDC connector. EMC currently supports these component types in the user interface:

- Submodel Service: used for asset or submodel data.
- Digital Twin Registry: used for digital twin registration and lookup functions.

You can start this flow in two ways:

- Click `ADD`, then choose `Component / Service`.
- Use the add-component action from an existing connector row.

![Component wizard](images/component-wizard.png)

The component wizard asks for:

- Component type.
- Component name.
- Linked connector.
- Service mode.
- Existing service URL and optional credentials, when connecting an already running service.

Use `Deploy new` when the service should be registered as a new component in the dashboard. Use `Connect existing` when the service already exists and you only want to link it to the connector.


## Connector and Component Status

After deployment, the dashboard lists connectors in the `EDC Connectors` table and linked services in the `Components & Services` table.

![Populated dashboard](images/manage-your-connectors-connected.png)

Connector rows show:

- Name.
- Version.
- Type.
- Status.
- Endpoint.
- Actions such as YAML/details, add component, and delete.

Component rows show:

- Name.
- Type.
- Version.
- Status.
- Linked connector.
- Actions such as details and delete.

Two further notes:

- A newly deployed connector appears before the first status check has completed, so it shows `Deploying` for a while.
- If a connector is deleted, linked components are also removed from the dashboard overview so the UI does not keep broken references.

## Status Reference

The console shows three different things, and they answer three different
questions. Nothing on these cards is a fixed label: every value is derived from
what the cluster reports.

### Status of one connector or component

This is the badge in the `Status` column of the tables and on the monitor page.
Hover it when it carries a detail message - that message names the reason.

| Badge | What it means | What to do |
| --- | --- | --- |
| **Active** | Running, and its own API answered. | Nothing. |
| **Deploying** | Still rolling out. Normal for the first minutes after a deployment. | Wait. If it stays here for much longer, check the cluster. |
| **Degraded** | Partly usable: some replicas are not ready, or all are ready but the component's API does not answer. | Read the detail on the badge; the component may still be starting or may be misconfigured. |
| **Failed** | Not usable. A container cannot start, or the rollout gave up. | Check the deployment; redeploy after fixing the cause. |
| **Not found** | Nothing is deployed for this entry any more, although the console still lists it. | The workloads were removed outside the console. Delete the entry, or redeploy it. |
| **Unknown** | The console could not ask the cluster. | This says nothing about your component - it is the console's view that is broken. Report it to the platform team. |

### System health (dashboard) and Overall health (monitor)

Both cards summarise **everything** you have deployed, using the same rule. The
worst state wins:

| Value | When |
| --- | --- |
| **Nothing deployed** | You have no connectors and no components yet. |
| **Critical** | At least one deployment is `Failed` or `Not found`. |
| **Warning** | At least one deployment is `Degraded`, or its status could not be read. |
| **Deploying** | At least one deployment is still rolling out, and nothing is worse. |
| **Healthy** | Every deployment is `Active`. |

The subtitle on the dashboard card (`3 of 4 deployments healthy`) tells you how
many entries are behind that verdict.

### Activity (dashboard)

Activity does **not** describe health. It answers "is something happening right
now, and is this page still up to date":

| What you see | What it means |
| --- | --- |
| **N deploying** | `N` connectors or components are currently rolling out. |
| **Idle** | Nothing is rolling out. A broken connector is still "Idle". |
| **Last sync 12:57:03** | The moment the page last reached the backend successfully. |
| **Waiting for first sync** | The page has not reached the backend yet in this session. |

The console re-reads the state once a minute. If the sync time stops advancing,
the backend is no longer answering - a yellow banner appears above the tables
and the values you see are the last known ones.

## Monitor Page

`Monitor` in the sidebar gives the operational view over the same data as the
dashboard, refreshed on the same one-minute interval:

- **Overall health**, healthy connectors, linked services against capacity, and the number of recent events.
- **Connector health**: per connector the type, status, last check and endpoints.
- **Service health**: per component the status and endpoint, plus how much of each type's capacity is in use.
- **Recommendations**: next steps derived from the current state, for example when connectors need attention or none exist yet.
- **Recent activity**: the most recent deployments with the state they reported. It is derived from the deployment list; the backend does not keep an event log.

## Dataspace Settings

The Dataspace Settings page is read-only. It displays platform and dataspace values loaded from backend configuration.

![Dataspace settings new](images/dataspace-settings.png)
The settings are grouped as:

- Dataspace overview: dataspace name, BPNL, realm, and read-only state.
- Access and identity: default username, Central IDP URL, Central IDP realm, and SSI wallet URL.
- Connected applications: Portal URL, SDE URL, SDE client ID, and manufacturer ID.
- Discovery and semantics: semantics URL, discovery finder endpoint, and BPN discovery endpoint.
- Infrastructure: default EDC URL, cluster context, provider EDC, consumer EDC, and registry URL.

These values are intended as reference information for users. They should be changed in the central platform or deployment configuration, not directly in the console.

## SDE Integration



The SDE URL is read from runtime configuration or from the backend dataspace settings. If the SDE page does not open, check whether an SDE URL is configured for the environment.

![SDE](images/app-sde.png)




## Short API Reference

The frontend primarily uses these backend endpoints:

- `GET /health`: backend health check.
- `GET /api/components`: list deployed components (connectors, digital twin
  registries, submodel servers, ...).
- `POST /api/component`: deploy one or more components.
- `GET /api/components/{id}`: get one component.
- `PUT /api/components/{id}`: upgrade one or more components.
- `DELETE /api/components/{name}`: delete one component by name.
- `GET /api/components/health`: health of every deployed component.
- `GET /api/components/{name}/health`: health of one component by name.
- `GET /api/config`: read application settings.
- `GET /api/dataspace`: read dataspace settings for the UI.
- `GET /api/logs?limit=50`: intended activity log endpoint, if enabled by the backend.

Some endpoints are protected by API key authentication, while others expect a Keycloak bearer token. See the known issues section for the current mismatch.

## Known Issues

- Some screenshots in older versions of the guide showed a four-step connector wizard. The current application separates EDC connector deployment from optional component/service setup.
- Backend initialization runs in the FastAPI `lifespan` handler, so `uvicorn app.main:app` and `python3 -m app.main` both wire up the managers identically.
- Authentication is currently mixed: some backend routes use `X-Api-Key`, while other routes use Keycloak bearer tokens.
- Swagger Keycloak OAuth integration is present as a placeholder and needs full configuration.
- The frontend calls an activity log endpoint, but the backend route may be disabled.
- Some UI labels use `Datasource Settings`, while the documentation and backend use `Dataspace Settings`.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2026 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console