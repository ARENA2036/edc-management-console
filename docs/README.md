# E2E Data Exchange with the EDC Management Console

## Overview

This guide introduces an end-to-end data exchange workflow within a Tractus-X style ecosystem. The starting point is a preconfigured company environment where users access the EDC Management Console (EMC) to provision the required components, including an Eclipse Dataspace Connector, optional Digital Twin Registry, and optional Submodel Service.

Once these services are deployed and configured, data exchange is carried out using the Simple Data Exchanger (SDE) application. SDE provides a streamlined interface that enables organizations to share data with minimal complexity while following the principles of secure, sovereign, and federated data spaces.

This document outlines the complete workflow from setting up the technical components to executing a successful data transfer, so participants can quickly gain hands-on experience with Tractus-X based data spaces.

> NOTE: EMC and the surrounding tutorial environment are still under active development. Some issues or temporary limitations may appear during workshops or preview deployments.

## Problem statement
Many organizations struggle to perform even a basic data exchange using Tractus-X components. Essential tools — such as an accessible way to provision EDCs or a simple interface for exchanging data are often missing, making the onboarding experience unnecessarily complex. Yet hands-on experience with data exchange is crucial for understanding the core mechanics of a data space, including policies, contract negotiation, semantic models, and the overall federated interaction patterns.

This tutorial addresses these challenges by providing a guided, end-to-end workflow that lowers the entry barrier, enables participants to set up the required components quickly, and demonstrates how data can be shared securely and efficiently. It helps users build an intuitive understanding of how Tractus-X works in practice and prepares them to develop or integrate more advanced dataspace use cases.

## Step 1: Onboarding
To ensure a smooth start, participants are onboarded into preconfigured companies where the EMC app and the Simple Data Exchanger (SDE) are already available. This avoids the complexity of setting up a full Tractus-X environment and allows users to focus directly on the data exchange workflow.

To join the tutorial, participants simply provide the workshop coaches with a valid email address. They will then receive individual access credentials to the assigned company environment. All accounts and tutorial resources are temporary and will be removed few days after the Community Days to reduce operating costs.

### Workshop Prerequisites

Participants should have:

- A modern web browser.
- A valid email address for account provisioning.
- Temporary Keycloak credentials provided by the workshop or platform team.
- The assigned company or tenant name to select during login.
- The BPNL and connector values provided for the exercise.
- Access to the EMC application URL and the configured SDE application.

Technical deployment tooling such as Docker, kubectl, Helm, Azure CLI, and registry access is only required for operators or developers who deploy the platform itself. Those technical prerequisites are listed in the repository [README](../README.md#prerequisites).

Future iterations of the tutorial may allow users to register their own company, deploy decentralized components directly through the UI, and independently perform a complete data exchange from scratch.


## Step 2: EMC Application


### Introduction
The EDC Management Console is a management platform for deploying, configuring, monitoring, and reviewing Eclipse Dataspace Connector (EDC) instances. It provides a central workspace where users can create an EDC connector, attach optional components such as a Submodel Service or Digital Twin Registry, review health and status information, and move into SDE for the actual exchange workflow.

#### Key Functionalities: 

- Deployment of EDC connector instances: The platform includes a guided wizard for connector setup.

- Connector and component management: Users can review, create, link, and delete connectors and related components.

- Version-based EDC connectors: The console allows users to select from the connector versions configured for the environment.

- System health and activity monitoring: Users can review high-level system health, connector status, and activity information.

- Authentication via Keycloak: The console integrates with a federated Keycloak service for user login and identity information.

- Backend API: The backend API supports connector logic, deployment operations, dataspace settings, and storage operations.

### User Manual

The EMC user manual can be found in [docs/user-guide](./user-guide/README.md).


## Step 3: SDE Application

### Introduction
The Simple Data Exchanger (SDE), formerly known as Data Format Transformer (DFT), is designed to make data sharing across organizations as straightforward as possible. It provides a lightweight, task-focused interface that abstracts the complexity of dataspace interactions while still relying on secure and sovereign exchange principles.

With SDE, users can upload, request, and transfer files without manually navigating connector configurations, policy definitions, or protocol details. Behind the scenes, SDE handles the required interactions with the Eclipse Dataspace Connector.


### User Manual

Open SDE from the EMC sidebar after the SDE URL has been configured for the environment. If separate SDE documentation is available for your deployment, use that guide for the exchange-specific steps.
SDE USer Manual-
https://github.com/ARENA2036/managed-simple-data-exchanger-frontend/tree/main/docs/user-guide


## Workshop Feedback

To continuously improve this tutorial and the Tractus-X onboarding experience, we kindly ask all participants to share their feedback via Menti. We are especially interested in your thoughts on the following questions:


Your input is extremely valuable and helps us refine both the tutorial and the supporting tools. Thank you for taking a moment to contribute.


Congratulations! you have completed all steps of this tutorial.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2026 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console