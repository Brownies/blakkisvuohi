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
    juo.js
    Juo menu command, uses inline version of commands.js
*/

'use strict';

const utils = require('../../lib/utils.js');
const constants = require('../../constants.js');
const strings = require('../../strings.js');
const str_juo = strings.commands.start.juo;
const alcomath = require('../../lib/alcomath.js');

function makeDrinkOption(drink_amount, drink_name) {
    return {
        _userRequired: true,
        _onSelect: (context, user, msg, words) => {
            return user.drinkBoozeReturnEBAC(drink_amount, drink_name, msg)
                .then((ebac) => {
                    const permilles = ebac.permilles;
                    const permilles30Min = ebac.permilles30Min;
                    const text = utils.getRandomFromArray(strings.drink_responses) + ' ' + strings.short_permilles_text.format({
                        permilles: utils.roundTo(permilles, 2),
                        permilles30Min: utils.roundTo(permilles30Min, 2)
                    });
                    return text;
                });
        }
    };
}

module.exports = {
    _text: str_juo.on_select,
    _userRequired: true,
    [str_juo.miedot.button_text]: {
        _text: str_juo.miedot.on_select,
        _userRequired: true,
        [strings.emoji.beer + ' 33cl 4.7%']: makeDrinkOption(constants.KALJA033, strings.emoji.beer + ' 33cl 4.7%'),
        [strings.emoji.beer + ' 33cl 5.3%']: makeDrinkOption(constants.calcAlcoholMilligrams(0.053, 0.33), strings.emoji.beer + ' 33cl 5.3%'),
        [strings.emoji.beer + ' 50cl 4.7%']: makeDrinkOption(constants.KALJA050, strings.emoji.beer + ' 50cl 4.7%'),
        [strings.emoji.beer + ' 56.8cl 4.7%']: makeDrinkOption(constants.calcAlcoholMilligrams(0.047, 0.568), strings.emoji.beer + ' 56.8cl 4.7%'),
    },
    [str_juo.viinit.button_text]: {
        _text: str_juo.viinit.on_select,
        _userRequired: true,
        [constants.emoji.wine + ' 12cl 12%']: makeDrinkOption(constants.calcAlcoholMilligrams(0.12, 0.12), constants.emoji.wine + ' 12cl 12%'),
        [constants.emoji.wine + ' 16cl 12%']: makeDrinkOption(constants.calcAlcoholMilligrams(0.16, 0.12), constants.emoji.wine + ' 16cl 12%'),
        [constants.emoji.wine + ' 20cl 12%']: makeDrinkOption(constants.calcAlcoholMilligrams(0.20, 0.12), constants.emoji.wine + ' 20cl 12%'),
    },
    [str_juo.shotit.button_text]: {
        _text: str_juo.shotit.on_select,
        _userRequired: true,
        '4cl 20%': makeDrinkOption(constants.calcAlcoholMilligrams(0.2, 0.04), '4cl 20%'),
        '4cl 32%': makeDrinkOption(constants.calcAlcoholMilligrams(0.32, 0.04), '4cl 32%'),
        '4cl 40%': makeDrinkOption(constants.calcAlcoholMilligrams(0.40, 0.04), '4cl 40%'),
        '4cl 60%': makeDrinkOption(constants.calcAlcoholMilligrams(0.60, 0.04), '4cl 60%')
    },
    [str_juo.oma.button_text]: {
        _text: str_juo.oma.on_select.format({
            help_example: str_juo.oma.help_example
        }),
        _userRequired: true,
        _onText: (context, user, msg, words) => {
            if (words.length !== 2) {
                return Promise.resolve(str_juo.oma.error_words.format({
                    help_example: str_juo.oma.help_example
                }));
            }
            const cl = words[0].replace('cl', ''),
                vol = words[1].replace('%', '');

            if (!utils.isValidFloat(cl)) {
                return Promise.resolve(str_juo.oma.error_cl.format({
                    help_example: str_juo.oma.help_example
                }));
            } else if (!utils.isValidFloat(vol)) {
                return Promise.resolve(str_juo.oma.error_vol.format({
                    help_example: str_juo.oma.help_example
                }));
            }

            const mg = constants.calcAlcoholMilligrams(vol / 100.0, cl / 100.0);
            return user.drinkBoozeReturnEBAC(mg, `Oma juoma - ${cl}cl ${vol}%`)
                .then((ebac) => {
                    const permilles = ebac.permilles;
                    const permilles30Min = ebac.permilles30Min;
                    const text = utils.getRandomFromArray(strings.drink_responses) + ' ' + strings.short_permilles_text.format({
                        permilles: utils.roundTo(permilles, 2),
                        permilles30Min: utils.roundTo(permilles30Min, 2)
                    });
                    return text;
                });
        }
    },
    [str_juo.jalkikellotus.button_text]: {
        _userRequired: true,
        _text: str_juo.jalkikellotus.on_select,
        _onText: (context, user, msg, words) => {
            const hours = context.fetchVariable('jalkikellotus_hours');
            const drinks = context.fetchVariable('jalkikellotus_drinks') || [];

            if (!hours) {
                const inputHours = utils.parseFloat(words[0]);
                if (!utils.isValidFloat(inputHours) || inputHours < 0 || inputHours > 24) {
                    return Promise.resolve(str_juo.jalkikellotus.hours_error);
                }

                context.storeVariable('jalkikellotus_hours', inputHours);
                return Promise.resolve(str_juo.jalkikellotus.input_drinks_start);
            }

            if (words.length < 2 || words.length % 2 !== 0) {
                return Promise.resolve(str_juo.jalkikellotus.input_drinks_words_error);
            }

            // validate each tuple
            for (let i = 0; i < words.length; i += 2) {
                const centiliters = utils.parseFloat(words[i].replace('cl', ''));
                const vol = utils.parseFloat(words[i + 1].replace('%', ''));
                if (!utils.isValidFloat(centiliters) || !utils.isValidFloat(vol) ||
                    centiliters < 0 || centiliters > 250 ||
                    vol < 0 || vol >= 100) {
                    return Promise.resolve(str_juo.jalkikellotus.input_drinks_drink_error.format({
                        drink: i / 2 + 1
                    }));
                }
            }

            // Validated, save to drinks array
            const oldDrinksLength = drinks.length;
            for (let i = 0; i < words.length; i += 2) {
                drinks.push({
                    name: str_juo.jalkikellotus.drink_name,
                    centiliters: utils.parseFloat(words[i]),
                    vol: utils.parseFloat(words[i + 1])
                });
            }
            context.storeVariable('jalkikellotus_drinks', drinks);

            return Promise.resolve(str_juo.jalkikellotus.input_drinks_drinks_correct.format({
                drinks_amount: drinks.length - oldDrinksLength,
                drinks_list: drinks.map(drink => drink.centiliters + 'cl ' + drink.vol + '%').join('\n')
            }));
        },
        [str_juo.jalkikellotus.save.button_text]: {
            _userRequired: true,
            _isAvailable: (context, user) => {
                return context.fetchVariable('jalkikellotus_drinks') &&
                    context.fetchVariable('jalkikellotus_drinks').length > 0;
            },
            _onSelect: (context, user, msg, words) => {
                const hours = context.fetchVariable('jalkikellotus_hours');
                const drinks = context.fetchVariable('jalkikellotus_drinks')
                    .map((d) => {
                        return {
                            text: d.name + ' ' + d.centiliters + 'cl ' + d.vol + '%',
                            mg: constants.calcAlcoholMilligrams(d.vol / 100, d.centiliters / 100)
                        };
                    });
                return user.drinkBoozeLate(drinks, hours)
                    .then((ebac) => {
                        const permilles = ebac.permilles;
                        const permilles30Min = ebac.permilles30Min;
                        const short_permilles_text = strings.short_permilles_text.format({
                            permilles: utils.roundTo(permilles, 2),
                            permilles30Min: utils.roundTo(permilles30Min, 2)
                        });
                        return str_juo.jalkikellotus.save.on_select.format({
                            drink_response: utils.getRandomFromArray(strings.drink_responses),
                            drinks_amount: drinks.length,
                            short_permilles_text: short_permilles_text
                        });
                    });
            },
            _onExit: (context, user, thisState, nextState) => {
                context.forgetVariable('jalkikellotus_hours');
                context.forgetVariable('jalkikellotus_drinks');
            }
        },
        _onExit: (context, user, thisState, nextState) => {
            // dont forget when moving to saving phase
            if (nextState !== thisState.getChild(str_juo.jalkikellotus.save.button_text)) {
                context.forgetVariable('jalkikellotus_hours');
                context.forgetVariable('jalkikellotus_drinks');
            }
        }
    },
    [str_juo.kumoa.button_text]: {
        _text: str_juo.kumoa.on_select,
        _userRequired: true,
        [strings.yes]: {
            _userRequired: true,
            _onSelect: (context, user, msg, words) => {
                return user.undoDrink()
                    .then(() => user.getBooze())
                    .then((drinks) => {
                        let ebac = alcomath.calculateEBACFromDrinks(user, drinks);
                        let permilles = ebac.permilles;
                        let permilles30Min = ebac.permilles30Min;
                        context.setInlineState(context.state.parent);
                        return strings.commands.laatta.success.format({
                            permilles: utils.roundTo(permilles, 2),
                            permilles30Min: utils.roundTo(permilles30Min, 2)
                        });
                    });
            }
        }
    }
};