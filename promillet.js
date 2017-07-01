'use strict';

const cmd = require('./cmd.js');
const utils = require('./utils.js');
const users = require('./users.js');
const when = require('when');

const ETANOL_GRAMS_PER_LITRE = 789;
const LIQUID_PERCENT = {mies: 0.75, nainen: 0.65};

function calcAlcoholMilliGrams(vol_perc, amount) {
  return Math.round(vol_perc * ETANOL_GRAMS_PER_LITRE * amount * 1000);
}

const TOLKKI = calcAlcoholMilliGrams(0.047, 0.33);
const PINTTI = calcAlcoholMilliGrams(0.047, 0.50);

function registerUserCmd(cmdName, cmdType, cmdFunc, cmdHelp) {
  cmd.register(cmdName, cmdType, function(msg, words){
    var deferred = when.defer();
    console.log('running user cmd ' + cmdName);
    users.find(msg.from.id)
    .then(function(user){
      console.log('Found user: ' + user.nick);
      cmdFunc(msg, words, user)
      .then(function(res){
        deferred.resolve(res);
      }, function(err){
        console.log(err);
        deferred.reject(err);
      });
    }, function(err){
      console.log(err);
      deferred.reject(err);
    });
    return deferred.promise;
  }, cmdHelp);
  console.log('Registerer user cmd ' + cmdName);
}

function findUser(msg) {
  let deferred = when.defer();
  users.find(msg.from.id)
  .then(function(user){
    if(!user){
      console.log('didn\'t find user ' + msg.from.id);
      msg.sendChatMsg('Moi! Juttele minulle ensiksi privassa ja luo tunnus käyttämällä komentoa /luotunnus');
      return deferred.reject('Not found');
    }
    console.log('found user ' + user.nick);
    deferred.resolve(user);
  }, function(err){
    msg.sendChatMsg('Moi! Juttele minulle ensiksi privassa ja luo tunnus käyttämällä komentoa /luotunnus');
    deferred.reject(err);
  });
  return deferred.promise;
}

cmd.register('/luotunnus', cmd.TYPE_PRIVATE, function(msg, words){
  users.new(msg.from.id, msg.from.username || msg.from.first_name + ' ' + msg.from.last_name, words[1], words[2])
  .then(function(user){
    msg.sendPrivateMsg('Moikka ' + user.nick);
  }, function(err){
    msg.sendPrivateMsg(err);
  });
}, '/luotunnus <paino> <mies/nainen>. Esim. /luotunnus 90 mies');

registerUserCmd('/whoami', cmd.TYPE_PRIVATE, function(msg, words, user){
  msg.sendPrivateMsg('Käyttäjä ' + user.nick + ', id: ' + user.userId + ', paino: ' + user.weight + ', sukupuoli: ' + user.gender);
}, '/whoami - tulosta omat tietosi.');

cmd.register('/tolkki', cmd.TYPE_PRIVATE, function(msg, words){
  findUser(msg)
  .then(function(user){
    users.drinkBooze(user, TOLKKI, '/tolkki')
    .then(function(){
      msg.sendPrivateMsg('Got it.');
    }, function(err){
      msg.sendPrivateMsg('Virhe: '+ err);
      throw 'Virhe!';
    });
  }, function(err){
    msg.sendPrivateMsg('Virhe: '+ err);
    throw 'Virhe!';
  });
}, '/tolkki - juo yksi 0.33l');

cmd.register('/pintti', cmd.TYPE_PRIVATE, function(msg, words){
  findUser(msg)
  .then(function(user){
    users.drinkBooze(user, PINTTI, '/pintti')
    .then(function(){
      msg.sendPrivateMsg('toimii');
    }, function(err){
      msg.sendPrivateMsg('Virhe: '+ err);
      throw 'Virhe!';
    });
  }, function(err){
    msg.sendPrivateMsg('Virhe: '+ err);
    throw 'Virhe!';
  });
}, '/pintti - juo yksi 0.5l');

cmd.register('/viina', cmd.TYPE_PRIVATE, function(msg, words){
  if(words.length < 3){
    throw 'puuttuu prosentit ja tai määrä';
  }

  findUser(msg)
  .then(function(user){
    let percent = parseFloat(words[1])/100;
    let amount = parseFloat(words[2]);
    if(percent === 'NaN' || amount === 'NaN' || percent > 1 || percent < 0 || amount > 10 || amount < 0){
      msg.sendPrivateMsg('Prosentti tai määrä on virheellinen!');
      return;
    }
    let alcoholInMG = calcAlcoholMilliGrams(percent, amount);
    users.drinkBooze(user, alcoholInMG, words.join(' '))
    .then(function(){
      msg.sendPrivateMsg('toimii');
    }, function(err){
      msg.sendPrivateMsg(err);
    });
  }, function(err){
    msg.sendPrivateMsg(err);
  });
}, '/viina (prosentti) (määrä litroissa). Esim. /viina 38 0.5');

function sumGrams(drinks) {
  let milligrams = 0;
  for(var i in drinks) {
    let drink = drinks[i];
    milligrams += drink.alcohol;
  }
  return milligrams;
}

function sumGramsUnBurned(user, drinks) {
  let milligrams = 0;
  let now = Date.now();
  let lastTime = null;
  let hourInMillis = 3600 * 1000;
  let userBurnRateMilligrams = user.weight / 10.0 * 1000;
  for(var i in drinks) {
    let drink = drinks[i];
    let drinkTime = Date.parse(drink.created);
    if(lastTime) {
      let diff = drinkTime - lastTime;
      let diffInHours = diff / hourInMillis;
      milligrams -= (userBurnRateMilligrams * diffInHours);
      milligrams = milligrams > 0 ? milligrams : 0;
    }
    milligrams += drink.alcohol;
    lastTime = drinkTime;
  }
  let diff = now - lastTime;
  let diffInHours = diff / hourInMillis;
  milligrams -= userBurnRateMilligrams * diffInHours;
  return milligrams > 0 ? milligrams : 0;
}

cmd.register('/annokset', cmd.TYPE_ALL, function(msg, words){
  findUser(msg)
  .then(function(user){
    users.getBooze(user)
    .then(function(drinks){
      let grams = sumGrams(drinks) / 1000.0;
      msg.sendPrivateMsg('Olet aikojen saatossa tuhonnut ' + grams.toFixed(2) + ' grammaa alkoholia, joka vastaa ' + (grams / 12.2).toFixed(2) + ' annosta.');
    }, function(err){
      msg.sendPrivateMsg(err);
    });
  }, function(err){
    msg.sendPrivateMsg(err);
  });
}, '/annokset - listaa kaikki annokset.');

cmd.register('/polttamatta', cmd.TYPE_ALL, function(msg, words){
  findUser(msg)
  .then(function(user){
    users.getBooze(user)
    .then(function(drinks){
      try {
        let grams = sumGramsUnBurned(user, drinks) / 1000.0;
        msg.sendPrivateMsg('Sinussa on jäljellä ' + grams.toFixed(2) + ' grammaa alkoholia, joka vastaa ' + (grams / 12.2).toFixed(2) + ' annosta.');
      } catch (err) {
        console.error(err);
        msg.sendPrivateMsg(err);
      }

    }, function(err){
      console.error(err);
      msg.sendPrivateMsg(err);
    });
  }, function(err){
    console.error(err);
    msg.sendPrivateMsg(err);
  });
}, '/polttamatta - listaa kuinka paljon alkoholia sinulla on polttamatta.');

cmd.register('/promillet', cmd.TYPE_ALL, function(msg, words){
  if(msg.chat.type === 'private'){
    findUser(msg)
    .then(function(user){
      users.getBooze(user)
      .then(function(drinks){
        try {
          let grams = sumGramsUnBurned(user, drinks) / 1000.0;
          let liquid = user.weight * LIQUID_PERCENT[user.gender] * 1000;
          msg.sendPrivateMsg((grams / liquid*1000).toFixed(2) + '‰');
        } catch (err) {
          console.error(err);
          msg.sendPrivateMsg(err);
        }
      }, function(err){
        console.error(err);
        msg.sendPrivateMsg(err);
      });
    }, function(err){
      console.error(err);
      msg.sendPrivateMsg(err);
    });
  } else {
    users.getBoozeForGroup(msg.chat.id)
    .then(function(drinksByUser){
      try {
        let permilles = [];
        for(var userId in drinksByUser){
          let details = drinksByUser[userId];
          let user = users.create(details.userid, details.nick, details.weight, details.gender);
          let grams = sumGramsUnBurned(user, details.drinks) / 1000.0;
          let liquid = user.weight * LIQUID_PERCENT[user.gender] * 1000;
          let userPermilles = (grams / liquid*1000).toFixed(2);
          permilles.push([user.nick, userPermilles, grams]);
        }
        permilles = permilles.sort(user => -user[1]).map(user => user[0] + '... ' + user[1] + '‰' + '(' + user[2].toFixed(1) + ' annosta)');
        msg.sendChatMsg(msg.chat.title + ' -kavereiden rippitaso:\n' + permilles.join('\n'));
      } catch (err) {
        console.error(err);
        msg.sendChatMsg('Virhe!');
      }
    }, function(err) {
      console.error(err);
      msg.sendChatMsg('Virhe!');
    });
  }
}, '/promillet - listaa kuinka paljon promilleja sinulla tai chatissa olevilla suunnilleen on.');

function makeDrinksString(drinks) {
  let list = [];
  let day = null;
  for(var i in drinks) {
    let drink = drinks[i];
    let drinkTime = new Date(Date.parse(drink.created));
    let drinkShortDate = drinkTime.getDate() + '.' + (drinkTime.getMonth()+1) + '.';
    if(day !== drinkShortDate) {
      day = drinkShortDate;
      list.push(day);
    }
    list.push(drink.description + ' ' + drinkTime.getHours() + ':' + drinkTime.getMinutes());
  }
  return list.join('\n');
}

cmd.register('/otinko', cmd.TYPE_PRIVATE, function(msg, words){
  findUser(msg)
  .then(function(user){
    users.getBoozeForLast48h(user)
    .then(function(drinks){
      try {
        let drinkList = makeDrinksString(drinks);
        msg.sendPrivateMsg(drinkList);
      } catch (err) {
        console.error(err);
        msg.sendPrivateMsg(err);
      }
    }, function(err){
      console.error(err);
      msg.sendPrivateMsg(err);
    });
  }, function(err){
    console.error(err);
    msg.sendPrivateMsg(err);
  });
}, '/otinko - näyttää otitko ja kuinka monta viime yönä.');

cmd.register('/moro', cmd.TYPE_ALL, function(msg, words){
  if(msg.chat.type !== 'group'){
    throw 'Käytä tätä komentoa ryhmässä!';
  }
  findUser(msg)
  .then(function(user){
    users.joinGroup(user, msg)
    .then(function(){
      msg.sendChatMsg('Rippaa rauhassa kera ' + msg.chat.title + ' -kavereiden.');
    }, function(err){
      console.error(err);
      msg.sendChatMsg('Rippaa rauhassa kera ' + msg.chat.title + ' -kavereiden.');
    });
  }, function(err){
    console.error(err);
    msg.sendChatMsg('Virhe!');
  });
}, '/moro - Lisää sinut ryhmään mukaan.');
