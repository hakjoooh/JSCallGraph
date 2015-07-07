var fs = require ('fs');
var esprima = require ('esprima');

function traverse (node, func) {
  func (node);
  for (var key in node) {
    if (node.hasOwnProperty (key)) {
      var child = node[key];
      if (typeof child === 'object' && child !== null) {
        if (Array.isArray(child)) {
          child.forEach (function(node) {
            traverse (node, func);
          });
        } else {
          traverse (child, func);
        }
      }
    }
  }
}

function tojson (ast) {
  return JSON.stringify (ast, null, 2); 
}

function loc2str (loc) {
  return "<" + loc.start.line + "c" + loc.start.column + ">";
}

// naming convention for anonymous functions
function nameOfLambda (fun) {
  return (loc2str(fun.loc));
}

function nameOfFunction (fun) {
  if (fun.id === null) // anonymous function
    return nameOfLambda (fun);
  else 
    return fun.id.name;
}

var callgraph = [];

function visitExp (fname,exp) {
  if (exp.type == "CallExpression") {
    if (exp.callee.type == "Identifier") {
      // console.log (fname + "  -> " + exp.callee.name);
      callgraph.push({caller : fname, callee : exp.callee.name});
    }
  }
}

function visitIfStmt (fname,ifstmt) {
  visitExp (fname,ifstmt.test);
  visitStmt (fname,ifstmt.consequent);
  if (ifstmt.alternate !== null)
    visitStmt (fname,ifstmt.alternate);
}

function visitLabStmt (fname,labstmt) {
  visitStmt (fname,labstmt.body);
}

function visitWithStmt (fname,withstmt) {
  visitStmt (fname,withStmt.body);
}

function visitRetStmt (fname,retstmt) {
  if (retstmt.argument !== null)
    visitExp (fname,retstmt.argument);
}

function visitThrowStmt (fname,throwstmt) {
  visitExp (fname,throwstmt.argument);
}

function visitTryStmt (fname,trystmt) {
  visitBlockStmt (fname,trystmt.block);
  if (trystmt.finalizer !== null) 
    visitBlockStmt (fname,trystmt.finalizer);
}

function visitWhileStmt (fname,whilestmt) {
  visitExp (fname,whilestmt.test);
  visitStmt (fname,whilestmt.body);
}

function visitDoWhileStmt (fname,dowhilestmt) {
  visitStmt (fname,dowhilestmt.body);
  visitStmt (fname,dowhilestmt.test);
}

function visitForStmt (fname,forstmt) {
   // ignored the "init" field
  if (forstmt.test !== null)
    visitExp (fname,forstmt.test);
  if (forstmt.update !== null)
    visitExp (fname,forstmt.update);
   visitStmt (fname,forstmt.body);
}

function visitForInStmt (fname,stmt) {
  // ignored stmt.left
  visitExp (fname,stmt.right);
  visitStmt (fname,stmt.body);
}

function visitExpStmt (fname,stmt) {
  visitExp (fname,stmt.expression);
}

function visitBlockStmt (fname,bstmt) {
  bstmt.body.forEach (function (stmt) {
    visitStmt (fname,stmt);
  });
}

function visitStmt (fname,stmt) {
  if (stmt.type == "BlockStatement") visitBlockStmt (fname,stmt);
  if (stmt.type == "IfStatement") visitIfStmt (fname,stmt);
  if (stmt.type == "LabeledStatement") visitLabStmt (fname,stmt);
  if (stmt.type == "WithStatement") visitWithStmt (fname,stmt);
  if (stmt.type == "ReturnStatement") visitRetStmt (fname,stmt);
  if (stmt.type == "TryStatement") visitTryStmt (fname,stmt);
  if (stmt.type == "TryStatement") visitTryStmt (fname,stmt);
  if (stmt.type == "WhileStatement") visitWhileStmt (fname,stmt);
  if (stmt.type == "DoWhileStatement") visitDoWhileStmt (fname,stmt);
  if (stmt.type == "ForStatement") visitForStmt (fname,stmt);
  if (stmt.type == "ForInStatement") visitForInStmt (fname,stmt);
  if (stmt.type == "ExpressionStatement") visitExpStmt (fname,stmt);
}

function visitFuntion (fname,fun) {
  visitBlockStmt (fname,fun.body);
}

function visitNode (node) {
  if (node.type == "FunctionDeclaration" || 
      node.type == "FunctionExpression") {
    visitFuntion (nameOfFunction(node),node);
  }
}

function analyzeCallGraph (code) {
  var ast = esprima.parse (code, {loc : true});
//  console.log (tojson (ast));
  traverse (ast, visitNode);
}

if (process.argv.length < 3) {
    console.log ('Usage: analyze.js file.js');
    process.exit(1);
}

var filename = process.argv[2];
var code = fs.readFileSync (filename);

analyzeCallGraph (code);

function printInDot (callgraph) {
  console.log ("digraph { ");
  callgraph.forEach (function (call) {
    console.log (call.caller + " -> " + call.callee + ";");
  });
  console.log ("}");
}

printInDot (callgraph);
