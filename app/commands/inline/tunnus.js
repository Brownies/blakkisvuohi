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
    tunnus.js
    Tunnus beta command, uses inline-commands.js
*/

'use strict';

const strings = require('../../strings.js');
const str_tunnus = strings.commands.beta.tunnus;
const utils = require('../../lib/utils.js');
const users = require('../../db/users.js');

module.exports = {
    _onSelect: (context, user, msg, words) => {
        if (user) {
            return Promise.resolve(str_tunnus.on_select.format({
                username: user.username,
                user_id: user.userId,
                weight: user.weight,
                height: user.height,
                gender: user.gender,
                created: user.created.toString()
            }));
        } else {
            return Promise.resolve(str_tunnus.on_select_new_user);
        }
    },
    [str_tunnus.muokkaa.button_text]: {
        _userRequired: true,
        _onSelect: (context, user, msg, words) => {
            return Promise.resolve(str_tunnus.muokkaa.on_select.format({
                username: user.username,
                weight: user.weight,
                height: user.height,
                gender: user.gender
            }));
        },
        [str_tunnus.muokkaa.paino.button_text]: {
            _userRequired: true,
            _onSelect: (context, user, msg, words) => {
                return Promise.resolve(str_tunnus.muokkaa.paino.on_select.format({
                    weight: user.weight
                }));
            },
            _onText: (context, user, msg, words) => {
                const weight = parseInt(words[0], 10);
                if (!utils.isValidInt(weight) || weight < 20 || weight > 250) {
                    return Promise.resolve(str_tunnus.luo.weight_error);
                }
                return user.updateWeight(weight)
                    .then(() => {
                        return str_tunnus.muokkaa.paino.on_change;
                    });
            }
        },
        [str_tunnus.muokkaa.pituus.button_text]: {
            _userRequired: true,
            _onSelect: (context, user, msg, words) => {
                return Promise.resolve(str_tunnus.muokkaa.pituus.on_select.format({
                    height: user.height
                }));
            },
            _onText: (context, user, msg, words) => {
                const height = parseInt(words[0], 10);
                if (!utils.isValidInt(height) || height < 40 || height > 240) {
                    return Promise.resolve(str_tunnus.luo.height_error);
                }
                return user.updateHeight(height)
                    .then(() => {
                        return str_tunnus.muokkaa.pituus.on_change;
                    });
            }
        },
        [str_tunnus.muokkaa.sukupuoli.button_text]: {
            _userRequired: true,
            _onSelect: (context, user, msg, words) => {
                return Promise.resolve(str_tunnus.muokkaa.sukupuoli.on_select.format({
                    gender: user.gender
                }));
            },
            [strings.gender.male]: {
                _userRequired: true,
                _onSelect: (context, user, msg, words) => {
                    context.setInlineState(context.state.parent); // go back one level
                    return user.updateGender('mies')
                        .then(() => {
                            return str_tunnus.muokkaa.sukupuoli.on_change;
                        });
                }
            },
            [strings.gender.female]: {
                _userRequired: true,
                _onSelect: (context, user, msg, words) => {
                    context.setInlineState(context.state.parent); // go back one level

                    return user.updateGender('nainen')
                        .then(() => {
                            return str_tunnus.muokkaa.sukupuoli.on_change;
                        });
                }
            }
        },
        [str_tunnus.paivita.button_text]: {
            _userRequired: true,
            _onSelect: (context, user, msg, words) => {
                return user.updateUsername(users.getUsernameFromMsg(msg))
                    .then(() => users.find(msg.from.id))
                    .then((updatedUser) => {
                        return str_tunnus.paivita.on_select.format({
                            username: updatedUser.username
                        });
                    });
            }
        }
    },
    [str_tunnus.poista.button_text]: {
        _userRequired: true,
        _text: str_tunnus.poista.on_select,
        [strings.yes]: {
            _userRequired: true,
            _text: str_tunnus.poista.double_confirm,
            [strings.no_1st]: {
                _userRequired: true,
                _onSelect: (context, user, msg, words) => {
                    context.setInlineState(context.state.parent.parent); // go back two levels
                    return Promise.resolve(str_tunnus.poista.canceled);
                }
            },
            [strings.yes]: {
                _userRequired: true,
                _onSelect: (context, user, msg, words) => {
                    context.setInlineState(context.state.parent.parent.parent); // go back three levels to the beginning
                    return user.delete()
                        .then(() => {
                            return str_tunnus.poista.deleted;
                        });
                }
            }
        },
        [strings.no_1st]: {
            _userRequired: true,
            _onSelect: (context, user, msg, words) => {
                return Promise.resolve(str_tunnus.poista.canceled);
            }
        }
    }
};