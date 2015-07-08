var fs = require ('fs');
var esprima = require ('esprima');
var escodegen = require ('escodegen');

if (process.argv.length < 3) {
    console.log ('Usage: instrument.js file.js');
    process.exit(1);
}

var filename = process.argv[2];
console.log (filename);
var code = fs.readFileSync (filename);
var ast = esprima.parse (code, { loc : true });

// annotate the program to track function calls
ast = insert (ast);
//console.log (JSON.stringify (ast, null, 2));

// generate the annotated program to JavaScript
var code_annot = escodegen.generate (ast);
// console.log (code_annot);
eval (code_annot);

function insert (ast) {
  ast = insertProgram (ast);
  return ast;
}

function insertProgram (pgm) {
  pgm.body = insertStmtArray (pgm.body);
  return pgm;
}

function insertStmtArray (stmtArray) {
  for (var i = 0; i < stmtArray.length; i++) {
    stmtArray[i] = insertStmt(stmtArray[i]);
  }
  return stmtArray;
}

function insertStmt (stmt) {
  if (stmt.type == "VariableDeclaration")
    stmt = insertVariableDecl (stmt);
  if (stmt.type == "FunctionDeclaration")
    stmt = insertFunctionDecl (stmt);
  if (stmt.type == "BlockStatement") 
    stmt = insertBlockStatement (stmt);
  if (stmt.type == "ExpressionStatement")
    stmt = insertExpressionStatement (stmt);
  if (stmt.type == "IfStatement")
    stmt = insertIfStatement (stmt);
  if (stmt.type == "LabeledStatement")
    stmt = insertLabeledStatement (stmt);
  if (stmt.type == "WithStatement")
    stmt = insertWithStatement (stmt);
  if (stmt.type == "SwitchStatement")
    stmt = insertSwitchStatement (stmt);
  if (stmt.type == "ReturnStatement")
    stmt = insertReturnStatement (stmt);
  if (stmt.type == "ThrowStatement") 
    stmt = insertThrowStatement (stmt);
  if (stmt.type == "TryStatement")
    stmt = insertTryStatement (stmt);
  if (stmt.type == "WhileStatement")
    stmt = insertWhileStatement (stmt);
  if (stmt.type == "DoWhileStatement")
    stmt = insertDoWhileStatement (stmt);
  if (stmt.type == "ForStatement")
    stmt = insertForStatement (stmt);
  if (stmt.type == "ForInStatement")
    stmt = insertForInStatement (stmt);
  return stmt;
}

function insertVariableDecl (stmt) {
  for (var i = 0; i < stmt.declarations.length; i++) {
    stmt.declarations[i] = insertVariableDeclarator(stmt.declarations[i]);    
  }
  return stmt;
}

function insertVariableDeclarator (decl) {
  if (decl.init !== null)
    decl.init = insertExpression (decl.init);
  return decl;
}

function insertFunctionDecl (stmt) {
  stmt.body = insertBlockStatement (stmt.body);
  fname = stmt.id.name; // id cannot be null
  stmt.body.body.unshift (esprima.parse("console.log('" + "FunctionEntry(named) : " + stmt.id.name + "')"));
  return stmt;
}

function insertBlockStatement (stmt) {
  stmt.body = insertStmtArray (stmt.body);
  return stmt;
}

function insertExpressionStatement (stmt) {
  stmt.expression = insertExpression (stmt.expression); 
  return stmt;
}

function insertIfStatement (stmt) {
  stmt.test = insertExpression (stmt.test);
  stmt.consequent = insertStmt (stmt.consequent);
  if (stmt.alternate !== null)
    stmt.alternate = insertStmt (stmt.alternate);
  return stmt;
}

function insertLabeledStatement (stmt) {
  stmt.body = insertStmt (stmt.body);
  return stmt;
}

function insertWithStatement (stmt) {
  stmt.body = insertStmt (stmt.body);
  return stmt;
}

function insertSwitchStatement (stmt) {
  stmt.discriminant = insertExpression (stmt.discriminant);
  for (var i = 0; i < stmt.cases.length; i++) {
    stmt.cases[i] = insertSwitchCase (stmt.cases[i]);
  }
  return stmt;
}

function insertReturnStatement (stmt) {
  if (stmt.argument !== null)
    stmt.argument = insertExpression (stmt.argument);
  return stmt;
}

function insertThrowStatement (stmt) {
  stmt.argument = insertExpression (stmt.argument);
  return stmt;
}

function insertTryStatement (stmt) {
  stmt.block = insertBlockStatement (stmt.block);
  if (stmt.handler !== null)
    stmt.handler = insertCatchClause (stmt.handler);
  if (stmt.finalizer !== null) 
    stmt.finalizer = insertBlockStatement (stmt.finalizer);
  return stmt;
}

function insertWhileStatement (stmt) {
  stmt.body = insertStmt (stmt.body);
  stmt.test = insertExpression (stmt.test);
  return stmt;
}

function insertDoWhileStatement (stmt) {
  stmt.body = insertStmt (stmt.body);
  stmt.test = insertExpression (stmt.test);
  return stmt;
}

function insertForStatement (stmt) {
  if (stmt.test !== null)
    stmt.test = insertExpression (stmt.test);
  if (stmt.update !== null)
    stmt.update = insertExpression (stmt.update);
  stmt.body = insertStmt (stmt.body);
  return stmt;
}

function insertForInStatement (stmt) {
  stmt.right = insertExpression (stmt.right);
  stmt.body = insertStmt (stmt.body);
  return stmt;
}

function insertExpression (exp) {
  if (exp.type == "ArrayExpression")
    exp = insertArrayExpression (exp);
  if (exp.type == "ObjectExpression")
    exp = insertObjectExpression (exp);
  if (exp.type == "SequenceExpression")
    exp = insertSequenceExpression (exp);
  if (exp.type == "UnaryExpression")
    exp = insertUnaryExpression (exp);
  if (exp.type == "BinaryExpression")
    exp = insertBinaryExpression (exp);
  if (exp.type == "AssignmentExpression")
    exp = insertAssignmentExpression (exp);
  if (exp.type == "UpdateExpression")
    exp = insertUpdateExpression (exp);
  if (exp.type == "LogicalExpression")
    exp = insertLogicalExpression (exp);
  if (exp.type == "ConditionalExpression")
    exp = insertConditionalExpression (exp);
  if (exp.type == "CallExpression") 
    exp = insertCallExpression (exp);
  if (exp.type == "MemberExpression")
    exp = insertMemberExpression (exp);
  if (exp.type == "FunctionExpression")
    exp = insertFunctionExpression (exp);
  return exp;
}

function insertFunctionExpression (exp) { // anonymous function definition
  exp.body = insertBlockStatement (exp.body);
  exp.body.body.unshift (esprima.parse("console.log('" + "FunctionEntry(anonymous) : " + loc2str(exp.loc) + "')"));
  return exp;
}

function insertExpressionArray (exparr) {
  for (var i = 0; i < exparr.length; i++) {
    exparr[i] = insertExpression (exparr[i]);
  }
  return exparr;
}

function insertCallExpression (exp) {
  exp.callee = insertExpression (exp.callee);
  exp.arguments = insertExpressionArray (exp.arguments);
  var logger = {
    type : 'CallExpression',
    callee : { 
        type : 'MemberExpression', 
        object : { 
          type : 'Identifier',
          name : 'console'
        },
        property : {
          type : 'Identifier',
          name : 'log' },
        computed : false },
    arguments : [ { type : 'Literal', value : "Callsite " + loc2str(exp.loc) + " " } ],
    loc : null
  };
  var newexp = {
    type : 'SequenceExpression',
    expressions : [logger,exp],
    loc : null 
  }
  return newexp; 
}

function insertArrayExpression (exp) {
  for (var i = 0; i < exp.elements.length; i++) {
    if (exp.elements[i] !== null)
      exp.elements[i] = insertExpression (exp.elements[i]);
  }
  return exp;
}

function insertObjectExpression (exp) {
  for (var i = 0; i < exp.properties.length; i++) {
    exp.properties[i] = insertProperty (exp.properties[i]);
  }
  return exp;
}

function insertProperty (prop) {
  prop.value = insertExpression (prop.value);
  return prop;
}

function insertSequenceExpression (exp) {
  exp.expressions = insertExpressionArray (exp.expressions);
  return exp;
}

function insertUnaryExpression (exp) {
  exp.argument = insertExpression (exp.argument);
  return exp;
}

function insertBinaryExpression (exp) {
  exp.left = insertExpression (exp.left);
  exp.right = insertExpression (exp.right);
  return exp;
}

function insertAssignmentExpression (exp) {
  // ignored the "left" field
  exp.right = insertExpression (exp.right);
  return exp;
}

function insertUpdateExpression (exp) {
  exp.argument = insertExpression (exp.argument);
  return exp;
}

function insertLogicalExpression (exp) {
  exp.left = insertExpression (exp.left);
  exp.right = insertExpression (exp.right);
  return exp;
}

function insertConditionalExpression (exp) {
  exp.test = insertExpression (exp.test);
  exp.consequent = insertExpression (exp.consequent);
  exp.alternate = insertExpression (exp.alternate);
  return exp;
}

function insertMemberExpression (exp) {
  exp.object = insertExpression (exp.object);
  exp.property = insertExpression (exp.property);
  return exp;
}

function insertSwitchClause (clause) {
  if (clause.test !== null)
    clause.test = insertExpression (clause.test);
  clause.consequent = insertStmtArray (clause.consequent);
  return clause;
}

function insertCatchClause (clause) {
  clause.body = insertBlockStatement (clause.body);
  return clause;
}

function loc2str (loc) {
  return (filename + ":" + loc.start.line + ":" + loc.start.column + "-" + loc.end.line + ":" + loc.end.column);
}
