const glob = require('glob');
const transformFileSync = require('@babel/core').transformFileSync;
const fs = require('fs');
const rimraf = require('rimraf');
const config = require('../i18n.config.js')();

const textArr = [];
const zhCH = new Map();

const targetDir = config.targetDir;
const exclude = config.exclude;
const callExpression = config.callExpression;
const autoZhKey = config.autoZhKey;

function run(path) {
    glob(`${path}/**/*.{js,jsx,ts,tsx}`, { ignore: exclude.map(pattern => `${path}/${pattern}`) }, (error, files) => {
        files.forEach(filename => {
            if (filename.includes('node_modules')) {
                return;
            }
            // 如果文件目录带了_，我认为他是测试用例
            if (filename.indexOf('_') !== -1) {
                return;
            }
            transformFileSync(filename, {
                presets: [
                    ["@babel/preset-typescript", { allExtensions: true, isTSX: true }],
                    [
                        "@babel/env",
                        {
                            "targets": "chrome > 58",
                            "modules": false,
                            "useBuiltIns": "usage",
                            loose: true,
                        }
                    ],
                    "@babel/preset-react"],
                plugins: [
                    "@babel/plugin-transform-typescript",
                    "@babel/plugin-syntax-typescript",
                    ["@babel/plugin-proposal-decorators", { "legacy": true }],
                    "@babel/plugin-proposal-class-properties",
                    "@babel/plugin-proposal-object-rest-spread",
                    "@babel/plugin-syntax-dynamic-import",
                    scan,
                ]
            });
        });

        // 这里写到text中，为了避免重复
        // 创建文件夹
        rimraf.sync(targetDir);
        fs.mkdirSync(targetDir);
        fs.appendFile(`${targetDir}/sourcemap.txt`, textArr.map((item, i) => `${item}#${i}\n`).join(''), function (err) {
            if (err) {
                return console.error(err);
            }
            console.log(`----共扫描文案 ${textArr.length} 条----`);
        });
        fs.appendFile(`${targetDir}/zh-CH.json`, `${JSON.stringify([...zhCH.values()], null, '\t')}`, function (err) {
            if (err) {
                return console.error(err);
            }
            console.log(`----去重后文案为 ${zhCH.size} 条----`);
        });
    });
}

function scan({ types: t }) {
    return {
        visitor: {
            JSXAttribute(path) {
                const { node } = path;
                // rules out attribute `d` (SVG path), `name` or `id` (just ids)
                if (node.name.name !== 'defaultMessage' && node.name.name !== 'd' && node.name.name !== 'name' && node.name.name !== 'id' && path.node.value) {
                    detectWording(node.value.value, path, 'jsx', 'JSXAttribute');
                }
            },
            JSXText(path) {
                const { node } = path;
                detectWording(node.value, path, 'jsx', 'JSXText');
            },
            AssignmentExpression(path) {
                detectWording(path.node.right.value, path, 'text', 'AssignmentExpression');
            },
            ObjectProperty(path) {
                detectWording(path.node.value.value, path, 'text', 'ObjectProperty');
            },
            ArrayExpression(path) {
                path.node.elements.forEach(item => {
                    if (item.value) {
                        detectWording(item.value, Object.assign({}, path, { node: item }), 'text', 'ArrayExpression');
                    }
                })
            },
            // 新增：new Person('小红')
            NewExpression(path) {
                path.node.arguments.forEach(item => {
                    detectWording(item && item.value, path, 'text', 'NewExpression');
                });
            },
            // 新增：函数调用；cb('这是一个错误')
            CallExpression(path) {
                if (path.node.callee && path.node.callee.object) {
                    if (path.node.callee.object.name === 'console') {
                        return;
                    }
                    if (path.node.callee.object.name === 'React') {
                        return;
                    }
                }

                path.node.arguments.forEach(item => {
                    callExpression && detectWording(item && item.value, path, 'text', 'CallExpression');
                });
            },
            // 新增：case '这是中文'；switchStatement, 
            SwitchCase(path) {
                if (path.node && path.node.test) {
                    detectWording(path.node.test.value, path, 'text', 'SwitchCase');
                }
            }
        },

    }
}

function detectWording(text, path, type, babelType) {
    if (typeof text == 'string' // sometimes text are null or non-string, this is a sanity check
        // assumming user-facing wording must contain at least an uppercase letter because it's English, this rules out all lowercase technical indentifiers
        && /.*[A-Z].*/.test(text)
        // assumming user-facing wording must not be ALL CAPS with no space, this rules out GET, POST etc.
        && !/^[A-Z0-9_]+$/.test(text)
        // rules out some technical terms by obvious substring
        && !/@@|SHA256|translateY|meta\.cfgScale|url\(#|\/github\/wiki\/Civitai-Link-Integration/.test(text)
        // rules out url
        && !/^http/.test(text)
        // rules out camelCase indentifiers like onChange, note that this assumes no space in the whole text so it's unlikely to rule out natural languages by mistake
        && !/^[a-z][A-Za-z0-9]*$/.test(text)
        // rules out also zswA_fefXvr like indentifiers, note that this assumes no space in the whole text so it's unlikely to rule out natural languages by mistake
        && !/^[a-zA-Z0-9_]+$/.test(text)
        // rules out colors
        && !/^#[0-9A-Fa-f]{6}$/.test(text)
        // rules out SVG path: 
        // this regex matches any string that consists of valid SVG path commands and coordinates, including whitespace and commas. 
        // to avoid detecting natural languages, this regex adds a negative lookahead to exclude any words that might appear in a sentence, e.g. "the", "and", and "in" 
        && !/^((?!\bthe\b|\band\b|\bin\b).)*([MmLlHhVvCcSsQqTtAaZz0-9.,\s]+)$/.test(text)
        // rules out anything too short
        // && text.length > 4
    ) {
        text = text.replace(/\n/g, '\\n');
        report(text, path, type, babelType)
    }
}

function report(text, path, type, babelType) {
    const { node } = path;
    const location = `${path.hub.file.opts.filename}#${node.loc ? node.loc.start.line : '!!!'}#${node.loc ? node.loc.start.column : '!!!'}`;

    let zhText = text.replace(/"/g, '\\\"');
    zhText = type == 'jsx' ? zhText.trim() : zhText;

    const sourceText = `${zhText}#${type}#${location}`;
    let notExist = false;
    if (type == 'text' && !~textArr.indexOf(`${zhText}#text#${location}`) && !~textArr.indexOf(`${zhText}#jsx#${location}`)) {
        notExist = true;
    } else if (type == 'jsx' && !~textArr.indexOf(`${zhText}#jsx#${location}`)) {
        notExist = true;
    }

    if (notExist) {
        // 没有扫描过
        console.log(sourceText + '#' + babelType);

        textArr.push(sourceText);
        // 中文文案已存在
        if (zhCH.has(zhText)) {
            const data = zhCH.get(zhText);
            data.source.push({ type, location });
            zhCH.set(zhText, data);
        } else {
            // 中文文案不存在
            zhCH.set(zhText, {
                id: autoZhKey ? zhText : "",
                defaultMessage: zhText,
                source: [{
                    type,
                    location
                }]
            });
        }
    }
}

module.exports = {
    run,
};
