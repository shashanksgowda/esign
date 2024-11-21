const express = require('express');
const { DocusignProcessor } = require('./src/getEsign');
const app = express();
const port = 3000;

app.get('/esign', async (req, res) => {
    try {
        const processor = new DocusignProcessor();
        const response = await processor.getEsignUrl();
        res.send(response);
    } catch (err) {
        console.log(err)
        res.status(500).send('Something went wrong');
    }
});

app.listen(port, () => {
    console.log(`Server listening 1  on port ${port}`);
});