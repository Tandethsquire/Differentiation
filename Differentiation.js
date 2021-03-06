// Pinch a couple of Numbas functions, for ease of later use
var compile = Numbas.jme.compile;
var ttJME = Numbas.jme.display.treeToJME;

/** Differentiates an expression, given as a string, recursively.
* Deals with each token in the syntax tree separately, applying the
* relevant rules, differentiating the child tokens as required.
*
* @param {String} input The expression as a string
* @param {String} arg The argument to differentiate with respect to
*
* @returns {String} The differentiated expression, as a string.
*/
function diff(input, arg)
{
  // Compiles a string to a syntax tree using NUMBAS
  var expr = compile(input);
  // If the current token is a variable, check if it's the differentiating variable or not
  if (expr['tok'].type == "name")
  {
    if (expr['tok'].name == arg)
      return "1";
    else
      return "0";
  }
  // If the current token is a number, return 0
  if (expr['tok'].type == "number" || expr['tok'].type == "integer")
    return "0";
  // For any other types, distinguish by their name
  var ename = expr['tok'].name;
  // Unary minus
  if (ename == "-u")
    return "-1*("+diff(ttJME(expr.args[0]),arg)+")";
  // Binary operations: according to differentiation rules, we differentiate its children and recombine
  if (expr['tok'].vars ==  "2")
  {
    var earg1 = ttJME(expr.args[0]);
    var earg2 = ttJME(expr.args[1]);
    if (ename == "+")
      return "((" + diff(earg1,arg)+")+("+diff(earg2,arg)+"))";
    if (ename == "-")
      return "(("+diff(earg1,arg)+")-("+diff(earg2,arg)+"))";
    if (ename == "*")
      return "(("+diff(earg1,arg)+")*("+earg2+")+("+earg1+")*("+diff(earg2,arg)+"))";
    if (ename == "/")
      return "((("+diff(earg1,arg)+")*("+earg2+")-("+earg1+")*("+diff(earg2,arg)+"))/(("+earg2+")*("+earg2+")))";
    // General form for differential of f(x)^g(x). Accounts for both stuff like x^n and e^x
    if (ename == "^")
      return "(("+earg1+")^("+earg2+"))*("+diff(earg2,arg)+"*ln("+earg1+")+((("+earg2+")*("+diff(earg1,arg)+"))/("+earg1+")))";

  }
  // Function operations: sin, cos etc. Basically the chain rule.
  if (expr['tok'].type == "function")
  {
    var earg = ttJME(expr.args[0]);
    if (ename == "exp")
      return "("+diff("e^("+earg+")",arg)+")";
    if (ename == "sin")
      return "("+diff(earg,arg)+")*cos("+earg+")";
    if (ename == "cos")
      return "-1*("+diff(earg,arg)+")*sin("+earg+")";
    if (ename == "tan")
      return "("+diff(earg,arg)+")*(1/(cos("+earg+")^2))";
    if (ename == "arcsin")
      return "("+diff(earg,arg)+")*(1/sqrt(1-("+earg+")^2))";
    if (ename == "arccos")
      return "-1*("+diff(earg,arg)+")*(1/sqrt(1-("+earg+")^2))";
    if (ename == "arctan")
      return "("+diff(earg,arg)+")*(1/(1+("+earg+")^2))";
    if (ename == "sinh")
      return "("+diff(earg,arg)+")*cosh("+earg+")";
    if (ename == "cosh")
      return "("+diff(earg,arg)+")*sinh("+earg+")";
    if (ename == "tanh")
      return "("+diff(earg,arg)+")*(1/(cosh("+earg+")^2))";
    if (ename == "arcsinh")
      return "("+diff(earg,arg)+")*(1/sqrt(1+("+earg+")^2))";
    if (ename == "arccosh")
      return "("+diff(earg,arg)+")*(1/sqrt(("+earg+")^2-1))";
    if (ename == "arctanh")
      return "("+diff(earg,arg)+")*(1/(1-("+earg+")^2))";
    if (ename == "ln")
      return "("+diff(earg,arg)+")*(1/("+earg+"))";
    if (ename == "sqrt")
      return "("+diff(earg,arg)+")*(1/(2*sqrt("+earg+")))";
    // Reciprocal trig functions: sec, cosec, etc.
    if (ename == "sec")
      var toDiff = "(1/cos("+earg+"))";
    if (ename == "cosec")
      var toDiff = "(1/sin("+earg+"))";
    if (ename == "cot")
      var toDiff = "(1/tan("+earg+"))";
    if (ename == "sech")
      var toDiff = "(1/cosh("+earg+"))";
    if (ename == "cosech")
      var toDiff = "(1/sinh("+earg+"))";
    if (ename == "coth")
      var toDiff = "(1/tanh("+earg+"))";
    // Slight difference with arcsec, etc: note that arcsec(x)=arccos(1/x)
    if (ename == "arcsec")
      var toDiff = "arccos(1/("+earg+"))";
    if (ename == "arccosec")
      var toDiff = "arcsin(1/("+earg+"))";
    if (ename == "arccot")
      var toDiff = "arctan(1/("+earg+"))";
    if (ename == "arcsech")
      var toDiff = "arccosh(1/("+earg+"))";
    if (ename == "arccosech")
      var toDiff = "arcsinh(1/("+earg+"))";
    if (ename == "arccoth")
      var toDiff = "arctanh(1/("+earg+"))";
    /* If it doesn't fit into one of the above, then it's probably a generic function
    * f(x): so return f'(x).
    * Could do with making this more clever: eg d('f(x)','x',6) returns f''''''(x).
    * Really want f^(6)(x)! The below commented code does't seem to do what's wanted, as regards
    * formatting the output string correctly.
    */
    /* if (ename.match(/\'\'/)!=null)
      return ename.replace(/\'\'/,"^\{\(3\)\}") + "(" + earg + ")";
    else if (ename.match(/\{\(\d\)\}/)!=null)
      return ename.replace(/\{\((\d)\)\}/,$1+1) + "(" + earg + ")";
    else */
      return "(" + ename + "\'(" + earg + "))";
  }
}

// Additional simplification rules for results of differentiation.
var extraRules = [
  ['ln(e)',[],'1'], // Log evaluations: ln(e)=1 and ln(x^y)=yln(x)
  ['ln((?;x)^(?;y))',[],'y*ln(x)'],
  // A set of rules to deal with quotients of powers.
  ['?;=x/?;=x','acg','1'], // x/x=1
  ['?;x/(?;y/?;z)','acg','((x*z)/(y))'], // x/(y/z)=xz/y
  ['(?;x/?;y)/?;z','acg','x/(y*z)'], // (x/y)/z=x/yz
  ['(?;x/?;y)*(?;z/?;w)','acg','(x*z)/(y*w)'], // x/y z/w = xz/yw
  ['?;=x^$n;n/?;=x^$n;m `| (?;=x/x^$n;m);n:1 `| (?;=x^$n;n/?;=x);m:1','acg', 'x^eval(n-m)'], // x^n/x^m = x^(n-m)
  ['?;=x^$n;n * ?;=x^$n;m `| (?;=x*?;=x^$n;m);n:1 `| (?;=x^$n;n * ?;=x);m:1','acg','(x^eval(n+m))'], //x^n x^m = x^(m+n)
  ['?;rest * ?;x^(-$n;n) `| ?;x^(-$n;n);rest:1','acg','rest/(x^n)'], // a x^(-n) = a/x^n
  // Dealing with fractions of variables (similar to simplifyFractions)
  ['?;x*1/?;y','acg','x/y'],
  ['(?;=x * ?;y)/?;=x `| (?;y * ?;=x)/?;=x','ag','y'], // xy/x = y
  ['(?;=x)/(?;=x * ?;y) `| (?;=x)/(?;y * ?;=x)','ag','1/y'] // x/xy = 1/y
];

var diffRules = Numbas.jme.rules.compileRules(extraRules,'diffrules'); // Compile these rules

// This is a quick and dirty fix for the problem with zeroFactor and collectNumbers looping endlessly!
Numbas.jme.rules.simplificationRules['all']['rules'][17]['options']['associative'] = false;
Numbas.jme.rules.simplificationRules['zeroFactor']['rules'][0]['options']['associative'] = false;
Numbas.jme.rules.simplificationRules['all']['rules'][8]['options']['associative'] = false;
Numbas.jme.rules.simplificationRules['basic']['rules'][8]['options']['associative'] = false;

// The object wrapper for the Numbas extension
Numbas.addExtension('Differentiation',['jme','jme-display','math'], function(di)
{
  var diffScope = di.scope;
  Numbas.jme.builtinScope.rulesets['diffrules'] = diffRules;

  /** A wrapper for the recursive differentiation function diff. Allows for multiple differentiation.
  *
  * @param {String} input The input expression
  * @param {String} arg The parameter to differentiate with respect to
  * @param {Integer} n The number of times to differentiate
  *
  * @returns {String} output
  */
  function d(input,arg,n)
  {
    var ind = n, expr = input;
    if (ind==0)
      return expr;
    for (i=0; i<ind; i++)
    {
      expr = Numbas.jme.display.simplifyExpression(diff(expr,arg),['all','diffrules'],Numbas.jme.builtinScope);
    }
    return expr;
  }

  // General stuff for NUMBAS definitions. Just needed to make a function object that NUMBAS likes.
  var funcObj = Numbas.jme.funcObj;
  var TString = Numbas.jme.types.TString;
  var TNum = Numbas.jme.types.TNum;

  diffScope.addFunction(new funcObj('d',[TString,TString,TNum],TString, function(input,arg,n){return Numbas.jme.display.simplifyExpression(d(input,arg,n),['all','diffrules'], Numbas.jme.builtinScope);}));
})
