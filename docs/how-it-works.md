# How EMS Simu-Pro Works

Welcome to EMS Simu-Pro, your AI-powered training partner for Emergency Medical Services. This document provides an overview of how to use the application to sharpen your clinical decision-making skills.

## 1. The Dashboard

The Dashboard is your home base. Here you'll find:
- **Key Metrics**: At-a-glance statistics like your number of completed scenarios and average score.
- **Start a Scenario**: A prominent button to jump into the scenario library.
- **Recent Activity**: A list of your most recently completed simulations, with quick links to their performance reports.
- **Welcome Tutorial**: If you're a new user, you'll see a prompt to start a guided tutorial scenario.

## 2. The Scenario Library

This is where you choose your challenge.
- **Filtering and Searching**: You can search for scenarios by title, or filter them by difficulty, subscription tier (free/pro), and descriptive tags (e.g., "Trauma", "Pediatric", "Cardiac").
- **Random Scenario**: Feeling adventurous? Use the "Start Random Scenario" button to be assigned a case from your filtered list.
- **Starting a Simulation**: Click "Start Simulation" on any card to begin.

## 3. The Simulation Interface

This is where the action happens. The screen is divided into two main columns.

### Left Column: At-a-Glance Info
- **Patient Profile**: A brief on the patient's age, gender, and relevant medical history.
- **Current Vitals**: A live look at the patient's vital signs, which will change in response to your actions.
- **Performance**:
    - **Time Elapsed**: A running clock for the simulation.
    - **Current Role**: The certification level (EMT, AEMT, Paramedic) you are simulating as.
    - **Controls**: Buttons to pause or end the simulation.
- **Live Action Log**: A time-stamped list of every assessment and treatment you perform, as you perform it.

### Right Column: Interaction & Logs
- **Simulation Log**: This is the main "chat" area. It displays the initial scenario details, your actions, and the AI-generated patient responses.
- **Action Tabs**: At the bottom, you'll find the tabs used to interact with the patient.
    - **Assessment**: Ask questions, describe physical exam findings, or use quick buttons to check things like blood glucose or an ECG.
    - **Treatment**: Select from a list of interventions appropriate for your certification level. Some have sub-options for dosage or delivery method.
    - **Destination**: Choose the appropriate hospital and transport mode (Routine vs. Emergency).
    - **Comms**: Generate an AI-assisted SBAR radio report or request medical direction.

### Special Case: Cardiac Arrest
For scenarios identified as a cardiac arrest, the interface changes to improve realism:
1.  **Initial State**: The patient is pulseless. The standard action tabs are visible.
2.  **Initiating CPR**: The specialized workflow begins only *after* you select "Cardiopulmonary Resuscitation (CPR)" from the Treatment tab.
3.  **Cardiac Arrest Tab**: Once CPR is started, the standard tabs are hidden and replaced with a single "Cardiac Arrest" tab. This tab contains only the critical interventions for resuscitation:
    - CPR (to start/stop)
    - Apply Monitor/Defibrillator Pads
    - Defibrillation
    - Pulse/Rhythm Check
    - Cardiac arrest medications (Epinephrine, Amiodarone, etc.)
4.  **Automated AED**: Every two minutes, the simulation will pause, and an automated AED analysis will occur, announcing "Shock Advised" or "No Shock Advised." You must then choose to defibrillate (or not).
5.  **ROSC**: If your interventions are successful and the patient achieves **Return of Spontaneous Circulation (ROSC)**, the "Cardiac Arrest" tab will disappear, and the standard action tabs will return, allowing you to proceed with post-arrest care.

## 4. The Performance Report

After ending a simulation, you are taken to the report page.
- **Scoring**: You'll see your scores for Assessment and Treatment.
- **AI Feedback**: A detailed, personalized analysis from the AI educator, explaining what you did well, what you missed, and how you can improve.
- **Action Log**: A final, time-stamped log of every action you took for review.
- **Objectives**: A summary of the mandatory actions, suggested actions, and critical failures for the scenario, specific to your role.

## 5. Admin Panel (For Admins)

Users with the 'admin' role have access to a special section in the sidebar to manage the application:
- **Users**: View all users, change their roles, and view their performance history.
- **Scenarios**: Create, edit, and delete simulation scenarios.
- **Interventions**: Manage the list of all medical interventions available in the app.
- **Support Tickets**: View and respond to user-submitted support tickets.

## 6. Settings & Support

- **Settings**: Change your display name, profile picture, simulation role, and application theme (light/dark/system).
- **Support**: Use the "Support" button in the sidebar to open a dialog and submit a ticket if you need help or have a question.
