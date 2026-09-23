import env from '../env.js?v=78'
import * as lib from '../lib.js?v=78'
import ui from '../ui.js?v=78'
// import hal from '../hal.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
// import GLOBAL from '../GLOBAL.js?v=78'
// import BROKER from '../EventBroker.js?v=78'
// import { Modal } from '../Modal.js?V=7'
// import USER from '../USER.js?v=78'
// import Alcove from '../classes/Alcove.js?v=78'


const POLICY = `
# Privacy Policy for Alcoves.xyz

**Last updated:** March 11, 2026

This Privacy Policy explains how Alcoves.xyz ("we", "us", or "our") collects, uses, and shares information when you use our chat application (the "Service").

By using the Service, you agree to the collection and use of information in accordance with this Privacy Policy.

## 1. Information We Collect

We may collect the following types of information when you use the Service:

1. **Account Information**  
   - Username, display name, password (hashed), profile photo, and contact details such as email address or phone number (if you choose to provide them).

2. **Chat Content**  
   - Messages, media, files, reactions, and any other content you send or receive via the Service.  
   - Metadata about messages (such as timestamps, sender/recipient IDs, and delivery/read status).

3. **Usage Data**  
   - Information about how you interact with the Service, such as features used, app settings, session duration, approximate activity times, and crash logs.

4. **Device and Technical Data**  
   - IP address, device type, operating system, app version, language, and other technical identifiers.

5. **Log Data**  
   - Server logs that may include your IP address, browser or app information, referring URLs, and request timestamps.

6. **Optional Data**  
   - If you choose to grant permission, we may access your contacts, camera, microphone, photos, or files solely to provide specific features (e.g., sending images, voice messages, or inviting contacts).

## 2. How We Use Information

We use the information we collect for the following purposes:

1. **Provide and Maintain the Service**  
   - To operate core chat functionality, deliver messages, manage accounts, and enable app features.

2. **Improve and Customize the Service**  
   - To monitor performance, fix bugs, analyze usage, and develop new features.  
   - To personalize aspects of the experience, such as suggested contacts or settings.

3. **Security and Abuse Prevention**  
   - To detect and prevent fraud, abuse, spam, or security incidents, and to protect the integrity of the Service.

4. **Customer Support**  
   - To respond to your requests, inquiries, bug reports, or feedback.

5. **Legal and Compliance**  
   - To comply with legal obligations, enforce our Terms of Service, and respond to lawful requests from authorities where required.

We do **not** sell or give your personal information to third parties.

## 3. Legal Bases for Processing (If Applicable)

If you are located in a region that requires a legal basis for processing (such as the European Economic Area), we process your information under one or more of the following bases:

- Your **consent** (for example, when you enable specific permissions or optional features).  
- **Contractual necessity** to provide the Service you requested.  
- **Legitimate interests**, such as improving the Service, preventing abuse, and ensuring security, where those interests do not override your rights.  
- **Compliance with legal obligations**.

## 4. How We Share Information

We may share your information in the following situations:

1. **Service Providers**  
   - Never - Alcoves.xyz does not use 3rd party providers for analytics or any other feature.

2. **Other Users**  
   - Certain profile details (like your username, avatar, and status) may be visible to other users you interact with.  
   - Messages are shared with the recipients and any participants in a conversation.

3. **Legal Requirements and Protection**  
   - When required by law or legal process, or to protect the rights, property, or safety of our users, the public, or us.

4. **Business Transfers**  
   - In connection with a transfer of ownership of all or part of our business, we will make reasonable efforts to notify you if your information becomes subject to a different privacy policy.

## 5. Data Retention

We retain your information only for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements.

- Account data is typically retained while your account remains active.  
- Messages are retained for indefinite amount of times.  Greater than 100 messages in an alcove are deleted permanently.  This number is subject to change, but the nature of the policy will remain.
- We may retain some logs and aggregated data for a longer period for security, analytics, and legal compliance.  
- If you delete your account, we will delete or anonymize your personal information within a reasonable timeframe, subject to technical and legal constraints.

## 6. Data Security

We use reasonable technical and organizational measures to protect your information, such as encryption in transit (e.g., HTTPS) and access controls.

## 7. Your Rights and Choices

Depending on where you live, you may have some or all of the following rights regarding your personal information:

- **Access**: Request a copy of the personal data we hold about you.  
- **Correction**: Request that we correct inaccurate or incomplete information.  
- **Deletion**: Request that we delete certain personal information.  
- **Restriction**: Request that we limit how we process your data.  
- **Objection**: Object to certain types of processing, such as direct marketing (if we ever use it).  
- **Portability**: Request a copy of your data in a structured, commonly used format.  
- **Withdraw Consent**: When processing is based on consent, you may withdraw that consent at any time.

To exercise these rights, please contact us at info@oko.nyc. We may require verification of your identity before responding to certain requests.

## 8. Children's Privacy

The Service is not directed to children under 13, and we do not knowingly collect personal information from children.

If you believe that a child has provided us with personal information, please contact us so that we can take appropriate action, such as deleting the information.

## 9. International Data Transfers

If you use the Service from outside the USA, your information may be transferred to and processed in countries that may have different data protection laws than your own.

We take steps to ensure adequate safeguards are in place, such as standard contractual clauses where required by law.

## 10. Third-Party Services and Links

The Service may contain links to third-party websites, apps, or services. We are not responsible for the privacy practices of these third parties.

We encourage you to review their privacy policies before providing any personal information.

## 11. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top and, where appropriate, provide additional notice (such as in-app notifications).

Your continued use of the Service after the effective date of any changes means that you accept the updated policy.

## 12. Contact Us

If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:

Alcoves.xyz / OKO design
Email: info@oko.nyc  
`




import('/node_modules/marked/lib/marked.esm.js')
.then( marked => {

	const content = document.getElementById('content')

	const policy  = lib.b('div')
	policy.innerHTML = marked.parse( POLICY )
	content.append( policy )

	// console.log( marked )

})