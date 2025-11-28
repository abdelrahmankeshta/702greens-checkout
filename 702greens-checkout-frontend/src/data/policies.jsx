import React from 'react';

const Heading = ({ children }) => (
    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#000', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
        {children}
    </h3>
);

const Paragraph = ({ children }) => (
    <p style={{ marginBottom: '1rem', lineHeight: '1.6', color: '#374151' }}>
        {children}
    </p>
);

const List = ({ children }) => (
    <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        {children}
    </ul>
);

const ListItem = ({ children }) => (
    <li style={{ marginBottom: '0.5rem', lineHeight: '1.6', color: '#374151' }}>
        {children}
    </li>
);

export const policies = {
    refund: {
        title: "Refund policy",
        content: (
            <>
                <Paragraph>
                    At 702Greens, we strive to deliver the freshest and highest quality microgreens to our customers. Due to the perishable nature of our products, all sales are final. However, we understand that issues may occasionally arise, and we are committed to ensuring your satisfaction. Please review our Refund and Return Policy below.
                </Paragraph>

                <Heading>1. Perishable Products</Heading>
                <List>
                    <ListItem><strong>Final Sale:</strong> All sales of microgreens and other perishable products are final. We do not accept returns or exchanges due to the perishable nature of these items.</ListItem>
                    <ListItem><strong>Quality Concerns:</strong> If you receive a product that is damaged or not of acceptable quality, please contact us within 24 hours of delivery at hello@702greens.com. Provide a detailed description of the issue, along with photos if possible, so we can assess the situation.</ListItem>
                </List>

                <Heading>2. Non-Perishable Products</Heading>
                <Paragraph>
                    For any non-perishable products (e.g., merchandise, tools, etc.), we offer a 14-day return policy from the date of delivery. The item must be unused, in its original packaging, and in the same condition that you received it.
                </Paragraph>
                <Paragraph>
                    <strong>Return Process:</strong> To initiate a return, please contact us at hello@702greens.com. We will provide you with instructions on how to return your item. You will be responsible for the cost of return shipping.
                </Paragraph>

                <Heading>3. Incorrect or Damaged Orders</Heading>
                <Paragraph>
                    If you receive an incorrect or damaged item, please notify us within 24 hours of delivery by emailing hello@702greens.com. Include your order number and a description of the issue. We will arrange for a replacement or a refund as appropriate.
                </Paragraph>

                <Heading>4. Cancellations</Heading>
                <Paragraph>
                    <strong>Order Cancellations:</strong> Because we grow our products specifically for each order, cancellations are only possible within 24 hours of placing your order. After this period, the order is considered final, and no cancellations or refunds will be issued.
                </Paragraph>
                <Paragraph>
                    <strong>Subscription Cancellations:</strong> You may cancel your subscription at any time, but please note that any payments made prior to cancellation are non-refundable. To cancel a subscription, contact us at hello@702greens.com.
                </Paragraph>

                <Heading>5. Refunds</Heading>
                <Paragraph>
                    <strong>Refund Eligibility:</strong> Refunds are only granted in cases where the product is deemed unacceptable due to damage or quality issues, and the issue is reported within 24 hours of delivery.
                </Paragraph>
                <Paragraph>
                    <strong>Refund Process:</strong> Once your refund request is approved, a credit will automatically be applied to your original method of payment. Please allow 5-7 business days for the refund to appear in your account.
                </Paragraph>
                <Paragraph>
                    <strong>Partial Refunds:</strong> In some cases, partial refunds may be granted at our discretion.
                </Paragraph>

                <Heading>6. Contact Information</Heading>
                <Paragraph>
                    If you have any questions about our Refund and Return Policy, please contact us at hello@702greens.com.
                </Paragraph>
            </>
        )
    },
    privacy: {
        title: "Privacy policy",
        content: (
            <>
                <Paragraph>
                    This Privacy Policy describes how 702greens.com (the “Site” or “we”) collects, uses, and discloses your Personal Information when you visit or make a purchase from the Site.
                </Paragraph>

                <Heading>Contact</Heading>
                <Paragraph>
                    After reviewing this policy, if you have additional questions, want more information about our privacy practices, or would like to make a complaint, please contact us by e-mail at hello@702greens.com or by mail using the details provided below:
                </Paragraph>
                <Paragraph>
                    702Greens LLC<br />
                    501 South Rancho Dr.<br />
                    Suite D20 PMB1051<br />
                    Las Vegas, NV 89106<br />
                    United States
                </Paragraph>

                <Heading>Collecting Personal Information</Heading>
                <Paragraph>
                    When you visit the Site, we collect certain information about your device, your interaction with the Site, and information necessary to process your purchases. We may also collect additional information if you contact us for customer support. In this Privacy Policy, we refer to any information about an identifiable individual (including the information below) as “Personal Information”. See the list below for more information about what Personal Information we collect and why.
                </Paragraph>

                <Heading>Device Information</Heading>
                <List>
                    <ListItem><strong>Purpose of collection:</strong> To load the Site accurately for you, and to perform analytics on Site usage to optimize our Site.</ListItem>
                    <ListItem><strong>Source of collection:</strong> Collected automatically when you access our Site using cookies, log files, web beacons, tags, or pixels.</ListItem>
                    <ListItem><strong>Disclosure for a business purpose:</strong> Shared with our processor Shopify.</ListItem>
                    <ListItem><strong>Personal Information collected:</strong> Version of web browser, IP address, time zone, cookie information, what sites or products you view, search terms, and how you interact with the Site.</ListItem>
                </List>

                <Heading>Order Information</Heading>
                <List>
                    <ListItem><strong>Purpose of collection:</strong> To provide products or services to you to fulfill our contract, to process your payment information, arrange for shipping, and provide you with invoices and/or order confirmations, communicate with you, screen our orders for potential risk or fraud, and when in line with the preferences you have shared with us, provide you with information or advertising relating to our products or services.</ListItem>
                    <ListItem><strong>Source of collection:</strong> Collected from you.</ListItem>
                    <ListItem><strong>Disclosure for a business purpose:</strong> Shared with our processor Shopify.</ListItem>
                    <ListItem><strong>Personal Information collected:</strong> Name, billing address, shipping address, payment information (including credit card numbers), email address, and phone number.</ListItem>
                </List>

                <Heading>Customer Support Information</Heading>
                <List>
                    <ListItem><strong>Purpose of collection:</strong> To provide customer support.</ListItem>
                    <ListItem><strong>Source of collection:</strong> Collected from you.</ListItem>
                    <ListItem><strong>Disclosure for a business purpose:</strong> [Add any vendors used to provide customer support].</ListItem>
                    <ListItem><strong>Personal Information collected:</strong> [Insert any modifications or additional information as needed].</ListItem>
                </List>

                <Heading>Minors</Heading>
                <Paragraph>
                    The Site is not intended for individuals under the age of [Insert age]. We do not intentionally collect Personal Information from children. If you are the parent or guardian and believe your child has provided us with Personal Information, please contact us at the address above to request deletion.
                </Paragraph>

                <Heading>Sharing Personal Information</Heading>
                <Paragraph>
                    We share your Personal Information with service providers to help us provide our services and fulfill our contracts with you, as described above. For example:
                </Paragraph>
                <List>
                    <ListItem>We use Shopify to power our online store. You can read more about how Shopify uses your Personal Information here: <a href="https://www.shopify.com/legal/privacy" target="_blank" rel="noopener noreferrer">https://www.shopify.com/legal/privacy</a>.</ListItem>
                    <ListItem>We may share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant, or other lawful request for information we receive, or to otherwise protect our rights.</ListItem>
                </List>

                <Heading>Behavioural Advertising</Heading>
                <Paragraph>
                    As described above, we use your Personal Information to provide you with targeted advertisements or marketing communications we believe may be of interest to you. For example:
                </Paragraph>
                <List>
                    <ListItem>We use Google Analytics to help us understand how our customers use the Site. You can read more about how Google uses your Personal Information here: <a href="https://www.google.com/intl/en/policies/privacy/" target="_blank" rel="noopener noreferrer">https://www.google.com/intl/en/policies/privacy/</a>. You can also opt-out of Google Analytics here: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">https://tools.google.com/dlpage/gaoptout</a>.</ListItem>
                    <ListItem>[Insert information about other advertising services used].</ListItem>
                </List>
                <Paragraph>
                    You can opt out of targeted advertising by:
                </Paragraph>
                <List>
                    <ListItem>Facebook - <a href="https://www.facebook.com/settings/?tab=ads" target="_blank" rel="noopener noreferrer">https://www.facebook.com/settings/?tab=ads</a></ListItem>
                    <ListItem>Google - <a href="https://www.google.com/settings/ads/anonymous" target="_blank" rel="noopener noreferrer">https://www.google.com/settings/ads/anonymous</a></ListItem>
                    <ListItem>Bing - <a href="https://advertise.bingads.microsoft.com/en-us/resources/policies/personalized-ads" target="_blank" rel="noopener noreferrer">https://advertise.bingads.microsoft.com/en-us/resources/policies/personalized-ads</a></ListItem>
                </List>
                <Paragraph>
                    Additionally, you can opt out of some of these services by visiting the Digital Advertising Alliance’s opt-out portal at: <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">https://optout.aboutads.info/</a>.
                </Paragraph>

                <Heading>Using Personal Information</Heading>
                <Paragraph>
                    We use your personal Information to provide our services to you, which includes offering products for sale, processing payments, shipping and fulfillment of your order, and keeping you up to date on new products, services, and offers.
                </Paragraph>

                <Heading>Lawful Basis (for EEA Residents)</Heading>
                <Paragraph>
                    Pursuant to the General Data Protection Regulation (“GDPR”), if you are a resident of the European Economic Area (“EEA”), we process your personal information under the following lawful bases:
                </Paragraph>
                <List>
                    <ListItem>Your consent;</ListItem>
                    <ListItem>The performance of the contract between you and the Site;</ListItem>
                    <ListItem>Compliance with our legal obligations;</ListItem>
                    <ListItem>To protect your vital interests;</ListItem>
                    <ListItem>To perform a task carried out in the public interest;</ListItem>
                    <ListItem>For our legitimate interests, which do not override your fundamental rights and freedoms.</ListItem>
                </List>

                <Heading>Retention</Heading>
                <Paragraph>
                    When you place an order through the Site, we will retain your Personal Information for our records unless and until you ask us to erase this information. For more information on your right of erasure, please see the ‘Your rights’ section below.
                </Paragraph>

                <Heading>Automatic Decision-Making (for EEA Residents)</Heading>
                <Paragraph>
                    If you are a resident of the EEA, you have the right to object to processing based solely on automated decision-making (which includes profiling), when that decision-making has a legal effect on you or otherwise significantly affects you.
                </Paragraph>
                <List>
                    <ListItem>We [do/do not] engage in fully automated decision-making that has a legal or otherwise significant effect using customer data.</ListItem>
                    <ListItem>Our processor Shopify uses limited automated decision-making to prevent fraud that does not have a legal or otherwise significant effect on you.</ListItem>
                </List>

                <Heading>Selling Personal Information (for California Residents)</Heading>
                <Paragraph>
                    Our Site [does/does not] sell Personal Information, as defined by the California Consumer Privacy Act of 2018 (“CCPA”).
                </Paragraph>

                <Heading>Your Rights</Heading>
                <Paragraph>
                    <strong>GDPR (for EEA Residents)</strong><br />
                    If you are a resident of the EEA, you have the right to access the Personal Information we hold about you, to port it to a new service, and to ask that your Personal Information be corrected, updated, or erased. If you would like to exercise these rights, please contact us through the contact information above.
                </Paragraph>
                <Paragraph>
                    <strong>CCPA (for California Residents)</strong><br />
                    If you are a resident of California, you have the right to access the Personal Information we hold about you (also known as the ‘Right to Know’), to port it to a new service, and to ask that your Personal Information be corrected, updated, or erased. If you would like to exercise these rights, please contact us through the contact information above.
                </Paragraph>

                <Heading>Cookies</Heading>
                <Paragraph>
                    A cookie is a small amount of information that’s downloaded to your computer or device when you visit our Site. We use a number of different cookies, including functional, performance, advertising, and social media or content cookies. Cookies make your browsing experience better by allowing the website to remember your actions and preferences.
                </Paragraph>
                <Paragraph>
                    You can control and manage cookies in various ways. Please keep in mind that removing or blocking cookies can negatively impact your user experience and parts of our website may no longer be fully accessible.
                </Paragraph>

                <Heading>Do Not Track</Heading>
                <Paragraph>
                    Please note that because there is no consistent industry understanding of how to respond to “Do Not Track” signals, we do not alter our data collection and usage practices when we detect such a signal from your browser.
                </Paragraph>

                <Heading>Changes</Heading>
                <Paragraph>
                    We may update this Privacy Policy from time to time in order to reflect changes to our practices or for other operational, legal, or regulatory reasons.
                </Paragraph>

                <Heading>Complaints</Heading>
                <Paragraph>
                    If you would like to make a complaint, please contact us by e-mail or by mail using the details provided under “Contact” above. If you are not satisfied with our response, you have the right to lodge your complaint with the relevant data protection authority.
                </Paragraph>
            </>
        )
    },
    terms: {
        title: "Terms of service",
        content: (
            <>
                <Paragraph>
                    <strong>Effective Date: January 1, 2022</strong>
                </Paragraph>
                <Paragraph>
                    Welcome to 702Greens. By accessing or using our website (the “Site”) at 702greens.com, you agree to comply with and be bound by the following terms and conditions (the “Terms of Use”). Please review the following terms carefully. If you do not agree with these terms, you should not use this Site.
                </Paragraph>

                <Heading>1. Acceptance of Agreement</Heading>
                <Paragraph>
                    You agree to the terms and conditions outlined in this Terms of Use Agreement (the “Agreement”) with respect to our Site. This Agreement constitutes the entire and only agreement between us and you, and supersedes all prior or contemporaneous agreements, representations, warranties, and understandings with respect to the Site, the content, products, or services provided by or through the Site, and the subject matter of this Agreement. We may amend this Agreement at any time, without specific notice to you. The latest Agreement will be posted on the Site, and you should review this Agreement prior to using the Site.
                </Paragraph>

                <Heading>2. Use of the Site</Heading>
                <Paragraph>
                    You are granted a non-exclusive, non-transferable, revocable license to access and use the Site in accordance with this Agreement. You may use the Site for personal, non-commercial purposes only. You may not use the Site for any other purpose, including any commercial purpose, without our express prior written consent.
                </Paragraph>

                <Heading>3. Privacy Policy</Heading>
                <Paragraph>
                    Your use of the Site is also governed by our Privacy Policy, which is incorporated into this Agreement by reference. Please review our Privacy Policy to understand our practices regarding the collection and use of your personal information.
                </Paragraph>

                <Heading>4. Product and Service Descriptions</Heading>
                <Paragraph>
                    We strive to be as accurate as possible in our product descriptions. However, we do not warrant that product descriptions or other content on the Site is accurate, complete, reliable, current, or error-free. If a product offered by 702Greens is not as described, your sole remedy is to return it in unused condition.
                </Paragraph>

                <Heading>5. Orders and Payments</Heading>
                <Paragraph>
                    When you place an order through the Site, you are agreeing to purchase the products and services in accordance with these Terms of Use. We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household, or per order. All prices are subject to change without notice.
                </Paragraph>

                <Heading>6. Subscription Services</Heading>
                <Paragraph>
                    702Greens offers subscription services that include recurring delivery of products. By subscribing, you agree to pay the subscription fees as described on the Site. You may skip, pause, or cancel your subscription at any time by emailing us at hello@702greens.com; however, please provide at least one week’s notice to allow us to adjust your order accordingly. Any payments made prior to these changes taking effect are non-refundable.
                </Paragraph>
                <Paragraph>
                    Please note that we are a grow-to-order company, meaning all produce orders are grown specifically for you.
                </Paragraph>

                <Heading>7. Shipping and Delivery</Heading>
                <Paragraph>
                    702Greens offers delivery services for our products. To ensure the successful delivery of your order, please provide us with all necessary information, including accurate address details, gate codes, and any special instructions. If we are unable to deliver your order due to missing or incorrect information, or if no one is available to receive the delivery, it is your responsibility to ensure that a cooler is left out to maintain maximum freshness. We are not responsible for the quality of the product if these conditions are not met.
                </Paragraph>

                <Heading>8. Refunds and Returns</Heading>
                <Paragraph>
                    Due to the perishable nature of our products, all sales are final. We cannot accept returns or exchanges. However, if there is an issue with your order, please contact us within 24 hours of delivery at hello@702greens.com, and we will do our best to address the concern.
                </Paragraph>

                <Heading>9. Skipping Deliveries</Heading>
                <Paragraph>
                    If you wish to skip a delivery, you must provide adequate notice according to your delivery cycle, typically 1-2 weeks in advance. This allows us to adjust our growing and delivery schedule accordingly. Failure to provide sufficient notice may result in the delivery being processed as usual.
                </Paragraph>

                <Heading>10. Modifications to Service and Prices</Heading>
                <Paragraph>
                    Prices for our products are subject to change without notice. We reserve the right to modify or discontinue the Service (or any part or content thereof) without notice at any time.
                </Paragraph>

                <Heading>11. Accuracy of Billing and Account Information</Heading>
                <Paragraph>
                    You agree to provide current, complete, and accurate purchase and account information for all purchases made at our store. You agree to promptly update your account and other information, including your email address and credit card numbers and expiration dates, so that we can complete your transactions and contact you as needed.
                </Paragraph>

                <Heading>12. Intellectual Property Rights</Heading>
                <Paragraph>
                    All content, organization, graphics, design, compilation, magnetic translation, digital conversion, and other matters related to the Site are protected under applicable copyrights, trademarks, and other proprietary rights (including but not limited to intellectual property) and are the property of 702Greens. The copying, redistribution, use, or publication by you of any such matters or any part of the Site, except as allowed by Section 2, is strictly prohibited. You do not acquire ownership rights to any content, document, or other materials viewed through the Site.
                </Paragraph>

                <Heading>13. Limitation of Liability</Heading>
                <Paragraph>
                    702Greens shall not be liable for any special, incidental, indirect, or consequential damages of any kind, or any damages whatsoever resulting from loss of use, data, or profits, whether or not we have been advised of the possibility of damage, and on any theory of liability, arising out of or in connection with the use or performance of the Site or the failure to provide products or services that you order from us.
                </Paragraph>

                <Heading>14. Indemnification</Heading>
                <Paragraph>
                    You agree to indemnify, defend, and hold harmless 702Greens, its officers, directors, employees, agents, licensors, suppliers, and any third-party information providers to the Site from and against all losses, expenses, damages, and costs, including reasonable attorneys' fees, resulting from any violation of this Agreement (including negligent or wrongful conduct) by you or any other person accessing the Site.
                </Paragraph>

                <Heading>15. Termination</Heading>
                <Paragraph>
                    We may suspend or terminate your access to the Site at our sole discretion, without notice and for any reason, including if we believe you have violated these Terms of Use.
                </Paragraph>

                <Heading>16. Governing Law</Heading>
                <Paragraph>
                    This Agreement shall be treated as though it were executed and performed in the State of Nevada, and shall be governed by and construed in accordance with the laws of the State of Nevada without regard to its conflict of law principles. The language in this Agreement shall be interpreted as to its fair meaning and not strictly for or against any party.
                </Paragraph>

                <Heading>17. Contact Information</Heading>
                <Paragraph>
                    If you have any questions or comments about these Terms of Use, please contact us at:
                </Paragraph>
                <Paragraph>
                    702Greens<br />
                    501 South Rancho Dr.<br />
                    Suite D20 PMB1051<br />
                    Las Vegas, NV 89106<br />
                    hello@702greens.com
                </Paragraph>

                <Heading>18. Changes to the Terms of Use</Heading>
                <Paragraph>
                    We reserve the right to modify these Terms of Use at any time. It is your responsibility to review these Terms periodically. Your continued use of the Site following the posting of changes will mean that you accept and agree to the changes.
                </Paragraph>
            </>
        )
    },
    cancellation: {
        title: "Cancellation policy",
        content: (
            <>
                <Paragraph>
                    When you purchase a subscription you'll receive repeat deliveries. These are based on the subscription duration and frequency that you select.
                </Paragraph>
                <Paragraph>
                    Your payment details will be stored securely and you'll be charged for each of these deliveries, unless you choose to pay in advance.
                </Paragraph>
                <Paragraph>
                    Some subscriptions may auto-renew at the end of their duration. If you don’t want to renew a subscription you can cancel it.
                </Paragraph>
                <Paragraph>
                    If you want to cancel or change your subscription, you can do it at any time. Your order confirmation emails have links to your order. You can manage your subscription from there.
                </Paragraph>
                <Paragraph>
                    See our returns policy for more details on returns and refunds.
                </Paragraph>
            </>
        )
    }
};
