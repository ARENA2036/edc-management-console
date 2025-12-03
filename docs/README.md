# E2E Data Exchange EDC management Console

## Overview

This guide introduces the tutorial for the end-to-end data exchange within the Tractus-X ecosystem. The starting point is the Tractus-X Portal, which serves as the central environment for managing an organization and accessing essential tools. Within the portal, users will work with the EDC Management Console (EMC) to provision the required components, including the Eclipse Dataspace Connector, Digital Twin Registry and the Submodel Server.

Once, these services are deployed and configured, data exchange is carried out using the Simple Data Exchanger (SDE) application. The SDE provides a streamlined interface that enables organizations to share data with minimal complexity while adhering to the principles of secure, sovereign, and federated data spaces.

This document outlines the complete workflow from setting up the technical components to executing a successful data transfer, so participants can quickly gain hands-on experience with Tractus-X based data spaces.

This scenario provides an initial preview of future open source components. The SDE is already available as open source, but is undergoing a fundamental overhaul. The EMC app will also be available as open source in the future.

> NOTE: Since, the apps are still under development, some issues/problems might be expected.

## Problem statement
Many organizations struggle to perform even a basic data exchange using Tractus-X components. Essential tools — such as an accessible way to provision EDCs or a simple interface for exchanging data are often missing, making the onboarding experience unnecessarily complex. Yet hands-on experience with data exchange is crucial for understanding the core mechanics of a data space, including policies, contract negotiation, semantic models, and the overall federated interaction patterns.

This tutorial addresses these challenges by providing a guided, end-to-end workflow that lowers the entry barrier, enables participants to set up the required components quickly, and demonstrates how data can be shared securely and efficiently. It helps users build an intuitive understanding of how Tractus-X works in practice and prepares them to develop or integrate more advanced dataspace use cases.

## Step 1: Onboarding
To ensure a smooth start, participants are onboarded into pre-configured companies where the EMC app and the Simple Data Exchanger (SDE) are already subscribed. This avoids the complexity of setting up a full Tractus-X environment and allows users to focus directly on the data-exchange workflow.

To join the tutorial, participants simply provide the workshop coaches with a valid email address. They will then receive individual access credentials to the assigned company environment. All accounts and tutorial resources are temporary and will be removed few days after the Community Days to reduce operating costs.

Future iterations of the tutorial will allow users to register their own company, deploy decentralized components directly through the UI, and independently perform a complete data exchange from scratch.


## Step 2: EMC Application


### Introduction
The EDC Management Console is a comprehensive management platform designed to facilitate the deployment, configuration, monitoring, and interaction with Eclipse Dataspace Connector (EDC) instances. It serves as a centralized tool that enables developers, administrators, and other users to efficiently manage data exchanges, connectors, and system operations within an EDC-based environment. The console is designed to work seamlessly with Keycloak for identity and access management and provides a unified, easy-to-use interface for managing connectors, policies, data flows, and monitoring system health. 

#### Key Functionalities: 

- Deployment of EDC Connector Instances: The platform includes a wizard for the straightforward deployment of EDC connector instances, ensuring quick setup and configuration for users. 

- Connector Management (CRUD operations): The EDC Management Console enables users to perform Create, Read, Update, and Delete (CRUD) operations on EDC connectors, allowing full control over the connector lifecycle.

- Version Based EDC Connectors: The console allows users to deploy different versions of EDCs. Currently, only v0.9.0 and 0.10.2 EDC versions are supported. 

- System Health and Activity Monitoring: Users can monitor system health, activity logs, and error tracking, ensuring smooth operation and quick identification of issues in the EDC infrastructure. 

- Data Operations using EDC: The console allows GET/POST data operations with policies, providing users with the ability to interact with and manage data exchanges securely and efficiently. 

- Authentication via Keycloak: The console integrates with the federated Keycloak service for user identification (e.g., authentication and authorization), ensuring secure access control and role-based permissions. 

- Backend API: The backend API facilitates the connector logic, EDC API proxying, and storage operations, providing a robust interface for developers to extend and customize their integration with the EDC framework. 



### User Manual

1. Start the EMC APP from the Portal
2. Login with your company credentials
3. Explore the existing EDCs
4. Press "add EDC" and follow the wizzard



## Step 3: SDE Application

### Introduction
The Simple Data Exchanger (SDE), Formerly known as Data Format Transformer (DFT), is an official Tractus-X product designed to make data sharing across organizations as straightforward as possible. It provides a lightweight, task-focused interface that abstracts the complexity of data-space interactions while still relying on the core Tractus-X principles of secure and sovereign exchange.

With the SDE, users can upload, request, and transfer files without needing to manually navigate connector configurations, policy definitions, or protocol specifics. Behind the scenes, SDE handles the necessary interactions with the Eclipse Dataspace Connector (EDC), making it an ideal entry point for newcomers who want to experience real data exchange quickly and reliably.

[!INFO]
> To get to know more about SDE, click here  

### User Manual

1. Start the SDE APP from the EMC
2. Login with your company credentials
3. From the Dashboard, go to Data provider and start Data Provisioning
    3.1. Click on Upload Data
    3.2. ...  
4. From the Dashboard, go to Data Consumer, and start Data Consumption
    4.1. Click on Consumer Data
    4.2. ...


## Workshop Feedback

To continuously improve this tutorial and the Tractus-X onboarding experience, we kindly ask all participants to share their feedback via Menti. We are especially interested in your thoughts on the following questions:

- How did you find the overall workshop?

- What did you like most during the workshop?

- What did you learn from the workshop?

- Do you have any suggestions or recommendations regarding the UI or functionality?

Your input is extremely valuable and helps us refine both the tutorial and the supporting tools. Thank you for taking a moment to contribute.
