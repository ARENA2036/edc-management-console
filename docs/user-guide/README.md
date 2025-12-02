# User Manual

## Table of contents
-   Getting started
    -  Accessing the app
        - Login
        - Logout
    - Navigation – Manage Your Connectors
    -   Skip Deploy EDC Connector steps

## Getting started
### Accessing the app
EMC can be accessed via a web browser.

## Login
1. Go to emc application url
    - Click on below url
    - https://emc-1-txcd.arena2036-x.de/

![alt text](images/emc-application.png)

2. Select your company from the list or search by typing its name.

![alt text](images/select-company.png)

3. You will be redirected to your company's Keycloak login page.

![alt text](images/company-Keycloak-login.png)

4. Enter your credentials (username/email and password).
-   Click Sign In

![alt text](images/enter-username-password.png)

5. You will be redirected EMC dashboard.

![alt text](images/dashboard.png)

## Logout

1. In the header, click on the user icon at the top-right corner.
2. Click Logout.
3. You will be redirected back to the login page.

![alt text](images/logout.png)

## Navigation – Manage Your Connectors

You can manage and deploy EDC connectors through a guided 4‑step process.

1. Navigate to the Add Connector button
- Click Add Connector 

![alt text](images/add-connector.png)

2. Step 1 - Deploy EDC Connector
- Enter the Service URL.
- Example format: https://new-submodel-service.arena2036-x.de
- Click Next.

![alt text](images/step1.png)

3. Step 2 - Digital Twin Registry
- Enter the Registry URL.
- Example format: registry.arena2036-x.de
- Click Next.

![alt text](images/step2.png)

4. Step 3 - EDC Deployment Configuration
Fill in the fields shown in the screenshot:
- EDC Name
- EDC Version (Options: 0.9.0 or 0.10.2 — select one)
- Endpoint URL (automatically populated after entering the EDC Name)
- Business Partner Number (BPN)
- Username
- password
You can also preview and copy the auto‑generated YAML using the Copy YAML option.
Click Next.

![alt text](images/step3.png)

5. Step 4 - Deploy EDC Connector
- If you want to review your inputs, click Previous.
- After verifying the details, click Deploy EDC.
- Once deployed, the connector will appear under Manage Your Connectors

![alt text](images/step4.png)

## Skip Deploy EDC Connector steps
- On the Deploy EDC Connector screen, you can click Skip to skip a step and move to the next one.

![alt text](images/skip-button.png)