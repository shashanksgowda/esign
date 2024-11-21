const docusign = require('docusign-esign');
const fs = require('fs'), path = require('path');

class DocusignProcessor {
    constructor() {
        const template = require('./template.json');
        this.template = template;
    }
    async getEsignUrl() {
        const dsClientId = process.env.CLIENT_ID;
        const impersonatedUserGuid = process.env.USER_ID;
        console.log(`dsClientId: ${dsClientId}, impersonatedUserGuid: ${impersonatedUserGuid}`);
        console.log(`Env variables: ${process.argv.toString()}`);
        // const filePath = path.join(__dirname, './private_key.pem'); 
        // const rsaKey = fs.readFileSync(filePath, 'utf8');
        const rsaKey = process.env.RSA_KEY;
        const basePath = "account-d.docusign.com";

        const dsApi = new docusign.ApiClient();
        dsApi.setOAuthBasePath(basePath);

        try {
            const results = await dsApi.requestJWTUserToken(
                dsClientId,
                impersonatedUserGuid,
                ["signature", "impersonation"],
                rsaKey,
                60000
            );
            const accessToken = results.body.access_token;
            dsApi.addDefaultHeader("Authorization", "Bearer " + accessToken);
            const userInfoResults = await dsApi.getUserInfo(accessToken);

            // Get default user of the account
            let userInfo = userInfoResults.accounts.find(
                (account) => account.isDefault === "true"
            );
            dsApi.setBasePath(userInfo.baseUri + "/restapi");

            console.log(`Template data -> ${JSON.stringify(this.template)}`);

            // Define signer
            let signer = docusign.Signer.constructFromObject({
                email: "test_user@test.com",
                name: "test_user",
                clientUserId: "1001",
                recipientId: "1001",
            });
            // fetch signer tabs from template config
            signer.tabs = this.template?.recipients?.signers?.[0]?.tabs;

            // Create the envelope definition
            const envelopeDefinition = new docusign.EnvelopeDefinition();
            envelopeDefinition.emailSubject = this.template?.emailSubject;
            envelopeDefinition.documents = this.template?.documents;
            envelopeDefinition.recipients = new docusign.Recipients();
            envelopeDefinition.recipients.signers = [signer];
            envelopeDefinition.status = 'sent';

            // Create the envelope
            let envelopesApi = new docusign.EnvelopesApi(dsApi);
            let envelopeSummary = await envelopesApi.createEnvelope(userInfo.accountId, {
                envelopeDefinition,
            });

            // prepare recipient view request payload
            // const recipientViewRequest = new docusign.RecipientViewRequest();
            const recipientViewRequest = this.template.recipients.signers[0]
            recipientViewRequest.returnUrl = "http://localhost:3011/onboarding/"; 
            recipientViewRequest.authenticationMethod = 'Email';
            recipientViewRequest.email = "test_user@test.com";
            recipientViewRequest.userName = "test_user";
            recipientViewRequest.clientUserId = signer.clientUserId;
            
            // create recipient view url
            const envelopeId = envelopeSummary.envelopeId;
            const viewUrl = await envelopesApi.createRecipientView(userInfo.accountId, envelopeId, { recipientViewRequest });
            return viewUrl;
        } catch (error) {
            console.log(error.response.data)
            throw new Error(error);
        }
    }
}

module.exports = {
    DocusignProcessor
}
