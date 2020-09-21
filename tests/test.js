
const getApis = require("../index").getApis;
const getEnvId = require("../index").getEnvId;

async function main() {
    let env = 'dev';
    let envId = await getEnvId(env);
    let apis = await getApis(envId);
    apis = apis.body;
    for (let i = 0; i < apis.assets.length; i += 1) {
        for (let j=0; j < apis.assets[i].apis.length; j +=1) {
            console.log(`api.name=${apis.assets[i].autodiscoveryApiName}`);
            console.log(`api.version=${apis.assets[i].apis[j].autodiscoveryInstanceName}\n`);
        }
    }
}

main();
