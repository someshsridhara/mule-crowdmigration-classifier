"use-strict";
const httpRequestPromise = require("request-promise");
const apis = require("./apis.json");
const envs = require("./environments.json");
const loginUrl = 'https://anypoint.mulesoft.com/accounts/login';
const orgId = ''
const credentials = {
    "username": process.env.username,
    "password": process.env.password
}

async function classifyApis(body, requestUri) {
    let request;
    let response;

    try {
        let headers = await getAuth(credentials);
        request = {
            resolveWithFullResponse: true,
            body: body,
            headers,
            json: true,
            port: 443,
            method: "POST",
            time: true,
            uri: requestUri
        };

        response = await httpRequestPromise(request);

        return response;
    } catch (error) {
        console.log(error);
    }
}


async function promoteApis(body, requestUri) {
    let request;
    let response;

    try {

        let headers = await getAuth(credentials);

        request = {
            resolveWithFullResponse: true,
            body: body,
            headers,
            json: true,
            port: 443,
            method: "POST",
            time: true,
            uri: requestUri
        };

        response = await httpRequestPromise(request);
        console.log(response.body);
        return response;
    } catch (error) {
        console.log(error);
        if (error.error.name === "ConflictError") {
            console.log(error.error.message);
        } else {
            throw error;
        }
    }
}

async function getApis(envId) {
    let request;
    let response;
    let requestUri = `https://anypoint.mulesoft.com/apimanager/api/v1/organizations/${orgId}/environments/${envId}/apis`;
    try {

        let headers = await getAuth(credentials);
        request = {
            resolveWithFullResponse: true,
            headers,
            json: true,
            port: 443,
            method: "GET",
            time: true,
            uri: requestUri
        };

        response = await httpRequestPromise(request);

        return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function handleApiClassification(apis) {
    apis = apis.apis;
    for (let i = 0; i < apis.length; i += 1) {
        let id = apis[i].id;
        for (let j = 0; j < apis[i].versions.length; j += 1) {
            let apiId = apis[i].versions[j].id;
            let {envId, envName, instanceLabel} = await getEnvId(apis[i].versions[j].name);
            let requestUri = `https://anypoint.mulesoft.com/apiplatform/repository/v2/organizations/${orgId}/apis/${id}/versions/${apiId}/classify`;
            let body = {"environmentId": envId, "instanceLabel": instanceLabel};
            let classifyResult = await classifyApis(body, requestUri);
            console.log(`${apis[i].name} - ${apis[i].versions[j].name} moved to --> ${envName} - instanceLabel: ${instanceLabel}\n Result: ${JSON.stringify(classifyResult)}\n`);
            // Delay between calls
            let wait = await sleep(1000);
        }
    }
}

async function handleApiPromotion(srcEnv, destEnv) {
    let srcEnvId = await getEnvId(srcEnv);
    let destEnvId = await getEnvId(destEnv);

    let getApisResponse = await getApis(srcEnvId);
    let apis = getApisResponse.body;

    for (let i = 0; i < apis.assets.length; i += 1) {
        let assetId = apis.assets[i].id;
        for (let j = 0; j < apis.assets[i].apis.length; j += 1) {
            let apiId = apis.assets[i].apis[j].id;
            let requestUri = `https://anypoint.mulesoft.com/apimanager/api/v1/organizations/${orgId}/environments/${destEnvId}/apis`;
            let body = {
                "instanceLabel": `${destEnv}`,
                "promote": {
                    "originApiId": apiId,
                    "policies": {
                        "allEntities": true
                    },
                    "tiers": {
                        "allEntities": true
                    },
                    "alerts": {
                        "allEntities": true
                    }
                }
            };
            let promoteApiResult = await promoteApis(body, requestUri);
        }
    }
}

async function getEnvIdForClassification(name) {
    let envName;
    let envId;
    let instanceLabel;
    try {
        let apiEnv = name.split('-')[1];
        instanceLabel = name.split('-')[0];
        if (name === "v1" || name === "v2") {
            apiEnv = "dev";
            instanceLabel = "base"
        }

        if (apiEnv === "prd") {
            apiEnv = "prod";
        }

        if (apiEnv === "sprd") {
            apiEnv = "sprod";
        }

        if (apiEnv === "sdrh" || apiEnv === "drh2") {
            instanceLabel = `${instanceLabel}-${apiEnv}`;
            apiEnv = "drh";
        }

        let env = envs.data.filter(env => (env.name.toLowerCase() === apiEnv));
        envId = env[0].id;
        envName = env[0].name;
    } catch (error) {
        console.log(error);
    }

    return {envId, envName, instanceLabel};
}

async function getEnvId(name) {
    let envName;
    let envId;
    try {
        let env = envs.data.filter(env => (env.name.toLowerCase() === name));
        envId = env[0].id;
        envName = env[0].name;
    } catch (error) {
        console.log(error);
    }

    return envId;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    let src = '';
    let dest = '';
    let result = await handleApiPromotion(src, dest);
}


async function getAuth(credentials) {

    const body = {
        username: credentials.username,
        password: credentials.password
    };
    let response;

    try {

        let request = {
            resolveWithFullResponse: true,
            body: body,
            headers: {
                "Content-type": "application/json"
            },
            json: true,
            port: 443,
            method: "POST",
            time: true,
            uri: loginUrl
        };

        response = await httpRequestPromise(request);
        console.log(response.body);
        response = response.body;

        if (response.token_type === "bearer" && response.access_token) {
            let headers = {
                'Authorization': `Bearer ${response.access_token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            return headers;
        }

    } catch (error) {
        console.log(error);
        throw error;

    }
}

// main();

module.exports = {getApis, getEnvId};
