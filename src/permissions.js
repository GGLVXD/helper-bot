function permission(rolesIDs, userID) {
    
    const GGLVXD = '689774740893859840';
    const NOLIFER = '953739647891173419';
    const BIGGESTDISCORDMOD = '981635724224909342';
    const EXTRADISCORDMOD = '978023668179427481';
    const DISCORDMOD = '1000413780657848320';
    const HIGHEST = 3;
    const MIDDLE = 2;
    const LOWEST = 1;

    if (String(userID) === GGLVXD) {
        return HIGHEST;
    }

    if(rolesIDs.includes(NOLIFER)){return HIGHEST;}
    if(rolesIDs.includes(BIGGESTDISCORDMOD)){return HIGHEST;}
    if(rolesIDs.includes(EXTRADISCORDMOD)){return MIDDLE;}
    if(rolesIDs.includes(DISCORDMOD)){return LOWEST;}
    
    return false;//no permission
}

module.exports = permission;