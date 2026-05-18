import hljs from "highlight.js/lib/core";
import language0 from "highlight.js/lib/languages/xml";
import language1 from "highlight.js/lib/languages/bash";
import language2 from "highlight.js/lib/languages/c";
import language3 from "highlight.js/lib/languages/cpp";
import language4 from "highlight.js/lib/languages/csharp";
import language5 from "highlight.js/lib/languages/css";
import language6 from "highlight.js/lib/languages/markdown";
import language7 from "highlight.js/lib/languages/diff";
import language8 from "highlight.js/lib/languages/ruby";
import language9 from "highlight.js/lib/languages/go";
import language10 from "highlight.js/lib/languages/graphql";
import language11 from "highlight.js/lib/languages/ini";
import language12 from "highlight.js/lib/languages/java";
import language13 from "highlight.js/lib/languages/javascript";
import language14 from "highlight.js/lib/languages/json";
import language15 from "highlight.js/lib/languages/kotlin";
import language16 from "highlight.js/lib/languages/less";
import language17 from "highlight.js/lib/languages/lua";
import language18 from "highlight.js/lib/languages/makefile";
import language19 from "highlight.js/lib/languages/perl";
import language20 from "highlight.js/lib/languages/objectivec";
import language21 from "highlight.js/lib/languages/php";
import language22 from "highlight.js/lib/languages/php-template";
import language23 from "highlight.js/lib/languages/plaintext";
import language24 from "highlight.js/lib/languages/python";
import language25 from "highlight.js/lib/languages/python-repl";
import language26 from "highlight.js/lib/languages/r";
import language27 from "highlight.js/lib/languages/rust";
import language28 from "highlight.js/lib/languages/scss";
import language29 from "highlight.js/lib/languages/shell";
import language30 from "highlight.js/lib/languages/sql";
import language31 from "highlight.js/lib/languages/swift";
import language32 from "highlight.js/lib/languages/yaml";
import language33 from "highlight.js/lib/languages/typescript";
import language34 from "highlight.js/lib/languages/vbnet";
import language35 from "highlight.js/lib/languages/wasm";
import language36 from "highlight.js/lib/languages/clojure-repl";
import language37 from "highlight.js/lib/languages/vbscript-html";
import language38 from "highlight.js/lib/languages/ldif";
import language39 from "highlight.js/lib/languages/erb";
import language40 from "highlight.js/lib/languages/node-repl";
import language41 from "highlight.js/lib/languages/bnf";
import language42 from "highlight.js/lib/languages/mojolicious";
import language43 from "highlight.js/lib/languages/fix";
import language44 from "highlight.js/lib/languages/profile";
import language45 from "highlight.js/lib/languages/dockerfile";
import language46 from "highlight.js/lib/languages/subunit";
import language47 from "highlight.js/lib/languages/ebnf";
import language48 from "highlight.js/lib/languages/dust";
import language49 from "highlight.js/lib/languages/csp";
import language50 from "highlight.js/lib/languages/parser3";
import language51 from "highlight.js/lib/languages/tap";
import language52 from "highlight.js/lib/languages/mizar";
import language53 from "highlight.js/lib/languages/taggerscript";
import language54 from "highlight.js/lib/languages/clean";
import language55 from "highlight.js/lib/languages/brainfuck";
import language56 from "highlight.js/lib/languages/gherkin";
import language57 from "highlight.js/lib/languages/golo";
import language58 from "highlight.js/lib/languages/flix";
import language59 from "highlight.js/lib/languages/dsconfig";
import language60 from "highlight.js/lib/languages/erlang-repl";
import language61 from "highlight.js/lib/languages/awk";
import language62 from "highlight.js/lib/languages/thrift";
import language63 from "highlight.js/lib/languages/protobuf";
import language64 from "highlight.js/lib/languages/nestedtext";
import language65 from "highlight.js/lib/languages/abnf";
import language66 from "highlight.js/lib/languages/step21";
import language67 from "highlight.js/lib/languages/jboss-cli";
import language68 from "highlight.js/lib/languages/roboconf";
import language69 from "highlight.js/lib/languages/smalltalk";
import language70 from "highlight.js/lib/languages/q";
import language71 from "highlight.js/lib/languages/properties";
import language72 from "highlight.js/lib/languages/capnproto";
import language73 from "highlight.js/lib/languages/prolog";
import language74 from "highlight.js/lib/languages/inform7";
import language75 from "highlight.js/lib/languages/rib";
import language76 from "highlight.js/lib/languages/julia-repl";
import language77 from "highlight.js/lib/languages/leaf";
import language78 from "highlight.js/lib/languages/vala";
import language79 from "highlight.js/lib/languages/accesslog";
import language80 from "highlight.js/lib/languages/pf";
import language81 from "highlight.js/lib/languages/http";
import language82 from "highlight.js/lib/languages/openscad";
import language83 from "highlight.js/lib/languages/pony";
import language84 from "highlight.js/lib/languages/scilab";
import language85 from "highlight.js/lib/languages/autohotkey";
import language86 from "highlight.js/lib/languages/smali";
import language87 from "highlight.js/lib/languages/sml";
import language88 from "highlight.js/lib/languages/rsl";
import language89 from "highlight.js/lib/languages/dns";
import language90 from "highlight.js/lib/languages/ceylon";
import language91 from "highlight.js/lib/languages/crmsh";
import language92 from "highlight.js/lib/languages/elm";
import language93 from "highlight.js/lib/languages/ocaml";
import language94 from "highlight.js/lib/languages/apache";
import language95 from "highlight.js/lib/languages/dos";
import language96 from "highlight.js/lib/languages/lisp";
import language97 from "highlight.js/lib/languages/cal";
import language98 from "highlight.js/lib/languages/haml";
import language99 from "highlight.js/lib/languages/django";
import language100 from "highlight.js/lib/languages/actionscript";
import language101 from "highlight.js/lib/languages/oxygene";
import language102 from "highlight.js/lib/languages/avrasm";
import language103 from "highlight.js/lib/languages/nim";
import language104 from "highlight.js/lib/languages/monkey";
import language105 from "highlight.js/lib/languages/gradle";
import language106 from "highlight.js/lib/languages/dts";
import language107 from "highlight.js/lib/languages/tp";
import language108 from "highlight.js/lib/languages/axapta";
import language109 from "highlight.js/lib/languages/reasonml";
import language110 from "highlight.js/lib/languages/nginx";
import language111 from "highlight.js/lib/languages/cmake";
import language112 from "highlight.js/lib/languages/tcl";
import language113 from "highlight.js/lib/languages/mercury";
import language114 from "highlight.js/lib/languages/xl";
import language115 from "highlight.js/lib/languages/zephir";

const languages = [
  ["xml", language0],
  ["bash", language1],
  ["c", language2],
  ["cpp", language3],
  ["csharp", language4],
  ["css", language5],
  ["markdown", language6],
  ["diff", language7],
  ["ruby", language8],
  ["go", language9],
  ["graphql", language10],
  ["ini", language11],
  ["java", language12],
  ["javascript", language13],
  ["json", language14],
  ["kotlin", language15],
  ["less", language16],
  ["lua", language17],
  ["makefile", language18],
  ["perl", language19],
  ["objectivec", language20],
  ["php", language21],
  ["php-template", language22],
  ["plaintext", language23],
  ["python", language24],
  ["python-repl", language25],
  ["r", language26],
  ["rust", language27],
  ["scss", language28],
  ["shell", language29],
  ["sql", language30],
  ["swift", language31],
  ["yaml", language32],
  ["typescript", language33],
  ["vbnet", language34],
  ["wasm", language35],
  ["clojure-repl", language36],
  ["vbscript-html", language37],
  ["ldif", language38],
  ["erb", language39],
  ["node-repl", language40],
  ["bnf", language41],
  ["mojolicious", language42],
  ["fix", language43],
  ["profile", language44],
  ["dockerfile", language45],
  ["subunit", language46],
  ["ebnf", language47],
  ["dust", language48],
  ["csp", language49],
  ["parser3", language50],
  ["tap", language51],
  ["mizar", language52],
  ["taggerscript", language53],
  ["clean", language54],
  ["brainfuck", language55],
  ["gherkin", language56],
  ["golo", language57],
  ["flix", language58],
  ["dsconfig", language59],
  ["erlang-repl", language60],
  ["awk", language61],
  ["thrift", language62],
  ["protobuf", language63],
  ["nestedtext", language64],
  ["abnf", language65],
  ["step21", language66],
  ["jboss-cli", language67],
  ["roboconf", language68],
  ["smalltalk", language69],
  ["q", language70],
  ["properties", language71],
  ["capnproto", language72],
  ["prolog", language73],
  ["inform7", language74],
  ["rib", language75],
  ["julia-repl", language76],
  ["leaf", language77],
  ["vala", language78],
  ["accesslog", language79],
  ["pf", language80],
  ["http", language81],
  ["openscad", language82],
  ["pony", language83],
  ["scilab", language84],
  ["autohotkey", language85],
  ["smali", language86],
  ["sml", language87],
  ["rsl", language88],
  ["dns", language89],
  ["ceylon", language90],
  ["crmsh", language91],
  ["elm", language92],
  ["ocaml", language93],
  ["apache", language94],
  ["dos", language95],
  ["lisp", language96],
  ["cal", language97],
  ["haml", language98],
  ["django", language99],
  ["actionscript", language100],
  ["oxygene", language101],
  ["avrasm", language102],
  ["nim", language103],
  ["monkey", language104],
  ["gradle", language105],
  ["dts", language106],
  ["tp", language107],
  ["axapta", language108],
  ["reasonml", language109],
  ["nginx", language110],
  ["cmake", language111],
  ["tcl", language112],
  ["mercury", language113],
  ["xl", language114],
  ["zephir", language115]
] as const;

for (const [name, language] of languages) {
  hljs.registerLanguage(name, language);
}

export const highlightedLanguageCount = languages.length;
export default hljs;
