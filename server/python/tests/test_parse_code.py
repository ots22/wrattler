"""
See if we can get the input and output frames from a code snippet
"""

from python_service import analyze_code, construct_func_string

def test_simple_exports():
    """
    check we can understand a simple variable assignment
    """
    testdata = {"code": "x = 5",
                "frames": [],
                "hash": "doesnmatter"}
    result = analyze_code(testdata)
    print(result)
    assert(result["exports"][0]=="x")

def test_simple_imports():
    """
    check we can understand a simple variable assignment where
    one term on the rhs is an existing frame
    """
    testdata = {"code": "x = y + 5",
                "frames": ["y"],
                "hash": "doesnmatter"}
    result = analyze_code(testdata)
    print(result)
    assert(result["imports"][0]=="y")


def test_multiple_assignment():
    """
    function might have two return values to unpack
    """
    testdata = {"code": "x,y = funcoutput(z)",
                "frames": ["z","a","b"],
                "hash": "doesntmatter"}
    result = analyze_code(testdata)
    print(result)
    assert(sorted(result["exports"]) == ["x","y"])
    assert(result["imports"] == ["z"])


def test_confusing_names():
    """
    Need to tell the difference between e.g. "x" and "xx"
    """
    testdata = {"code": "xx = xxx(x) + yy",
                "frames": ["x","y"],
                "hash": "doesntmatter"}
    result = analyze_code(testdata)
    print(result)
    assert(result["exports"]==["xx"])
    assert(result["imports"]==["x"])


def test_out_of_scope_assignments():
    """
    variables assigned e.g. inside function definitions should not
    be added to exports
    """
    code = 'def hello():\n    x = pd.DataFrame({"xx":[1,2,3]})\n    return x\n\nnewx = hello()\n\n'
    testdata = {"code": code,
                "frames": [],
                "hash": "irrelevant"}
    result = analyze_code(testdata)
    print(result)
    assert(result["exports"]==["newx"])


def test_imports_used_in_functions():
    """
    imported variables can be used inside functions.
    """
    code = 'def hello():\n    x = a + b\n    return x\n\nnewx = hello()\n\n'
    testdata = {"code": code,
                "frames": ["a","b"],
                "hash": "irrelevant"}
    result = analyze_code(testdata)
    print(result)
    assert(result["exports"]==["newx"])
    assert(sorted(result["imports"])==["a","b"])

def test_non_assignment_imports():
    """
    variables can be used in statements that are not assignments..
    """
    code = "a.dosomething(b,c)" # a, b and c should be imports
    testdata = {"code": code,
                "frames": ["a","b","c"],
                "hash": "irrelevant"}
    result = analyze_code(testdata)
    print(result)
    assert(sorted(result["imports"]) == ["a","b","c"])



def test_method_calling_imports():
    """
    variables can be used in statements that are not assignments..
    """
    code = "x = a.dosomething(b,c)" # a, b and c should be imports
    testdata = {"code": code,
                "frames": ["a","b","c"],
                "hash": "irrelevant"}
    result = analyze_code(testdata)
    print(result)
    assert(sorted(result["imports"]) == ["a","b","c"])
    assert(result["exports"] == ["x"])


def test_imports_same_var_twice():
    """
    We only want to read in a dataframe once, even if
    the variable appears in the code fragment multiple times.
    """
    code = "x = a + b\ny = a + c\n"
    testdata = {"code": code,
                "frames": ["a","b","c"],
                "hash": "irrelevant"}
    result = analyze_code(testdata)
    print(result)
    assert(result["imports"].count("a")==1)


def test_exports_same_var_twice():
    """
    We only want to upload a dataframe once, even if
    the variable appears in the code fragment multiple times.
    """
    code = "x = a + b\nx = c + d\n"
    testdata = {"code": code,
                "frames": ["a","b","c"],
                "hash": "irrelevant"}
    result = analyze_code(testdata)
    print(result)
    assert(result["exports"].count("x")==1)


def test_func_string_same_input_var_twice():
    """
    As test above, but checking that the func string only reads the
    variable from datastore once.
    """
    code = "x = a + b\ny = a + c\n"
    frame_dict = {"a": 2, "b":3, "c":4}
    return_vars = ["x","y"]
    output_hash = "testhash"
    func_string = construct_func_string(code, frame_dict, return_vars, output_hash)
    assert(func_string.count("a = ") == 1)
    print(func_string)
