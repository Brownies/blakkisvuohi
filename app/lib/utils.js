/*
    Bläkkisvuohi, a Telegram bot to help track estimated blood alcohol concentration.
    Copyright (C) 2017  Joonas Ulmanen

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
    utils.js
    Commonly used functions.
*/

'use strict';

let utils = module.exports = {};
let when = require('when');

utils.getDateMinusHours = function(hours) {
    const hourInMillis = 3600 * 1000;
    const hoursAgo = new Date(Date.now() - hours * hourInMillis);
    return hoursAgo;
};


function createSendPrivateMsgFunction(msg, bot) {
    return function(text) {
        let deferred = when.defer();
        bot.sendMessage(msg.from.id, text)
            .then(() => {
                console.log('sent ' + text + ' to ' + msg.from.username);
                deferred.resolve();
            }, (err) => {
                console.error('couldn\'t send private msg! Err: ' + err);
                deferred.reject(err);
            });
        return deferred.promise;
    };
}

function createSendChatMsgFunction(msg, bot) {
    return function(text) {
        let deferred = when.defer();
        bot.sendMessage(msg.chat.id, text)
            .then(() => {
                console.log('sent ' + text + ' to chat ' + msg.chat.title);
                deferred.resolve();
            }, (err) => {
                console.error('couldn\'t send chat msg! Err: ' + err + ' trace: ' + err.stack);
                deferred.reject(err);
            });
        return deferred.promise;
    };
}

function createSendMsgToFunction(msg, bot) {
    return function(chatId, text, options) {
        let deferred = when.defer();
        bot.sendMessage(chatId, text, options)
            .then(() => {
                console.log('sent ' + text + ' to chat ' + chatId);
                deferred.resolve();
            }, (err) => {
                console.error('couldn\'t send chat msg! Err: ' + err);
                deferred.reject(err);
            });
        return deferred.promise;
    };
}

function createSendPhotoFunction(msg, bot) {
    return function(chatId, stream, options) {
        let deferred = when.defer();
        bot.sendPhoto(chatId, stream, options)
            .then(() => {
                console.log('sent photo to chat ' + chatId);
                deferred.resolve();
            }, (err) => {
                console.error('couldn\'t send chat msg! Err: ' + err);
                deferred.reject(err);
            });
        return deferred.promise;
    };
}

function createUserToStringFunction(msg) {
    return function() {
        return 'user: {id: ' + msg.from.id + ', name: ' + msg.from.first_name + ' ' + msg.from.last_name + ', username: ' + msg.from.username + '}';
    };
}

utils.attachMethods = function attachMethods(msg, bot)  {
    msg.sendPrivateMessage = createSendPrivateMsgFunction(msg, bot);
    msg.sendChatMessage = createSendChatMsgFunction(msg, bot);
    msg.sendMessage = createSendMsgToFunction(msg, bot);
    msg.userToString = createUserToStringFunction(msg, bot);
    msg.sendPhoto = createSendPhotoFunction(msg, bot);
};

utils.isValidInt = function(num) {
    return !!parseInt(num, 10);
};

utils.isValidFloat = function(num) {
    return !!parseFloat(num);
};