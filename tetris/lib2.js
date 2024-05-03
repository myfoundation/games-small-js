/*
MasterMentor (c) 2024
STEAMCLUB LICENCE
https://steamclub.net
*/

// https://github.com/jashkenas/underscore/issues/162#issuecomment-99285214
var deepClone = function(obj)
{
	return (!obj || (typeof obj !== 'object'))?obj:
		(_.isString(obj))?String.prototype.slice.call(obj):
		(_.isDate(obj))?new Date(obj.valueOf()):
		(_.isFunction(obj.clone))?obj.clone():
		(_.isArray(obj)) ? _.map(obj, function(t){return _.deepClone(t)}):
		_.mapObject(obj, function(val, key) {return _.deepClone(val)});
};
if(_ && !_.deepClone) _.deepClone = deepClone;

var new_clone = deepClone;

//------------------------------------------
// COMBINATORICS
//------------------------------------------
// cartesianProduct([1, 2], [3, 4], ['a', 'b']);
// [[1,3,"a"],[1,3,"b"],[1,4,"a"],[1,4,"b"],[2,3,"a"],[2,3,"b"],[2,4,"a"],[2,4,"b"]]
function cartesianProduct()
{
	return _.reduce(arguments, function(a, b)
	{
		return _.flatten(_.map(a, function(x)
		{
			return _.map(b, function(y)
			{
				return x.concat([y]);
			});
		}), true);
	}, [ [] ]);
}
//------------------------------------------

var isPlainObject = (x) => typeof x === 'object' && !Array.isArray(x) &&  x !== null;
var LOG = function() { console.log.apply(null, arguments); };
var LEN = (x) => isPlainObject(x) ? Object.keys(x).length : x.length;
var shallow = (x) => Array.isArray(x) ? x.slice() : (isPlainObject(x) ? new Map(x) : JSON.parse(JSON.stringify(x)));
var isNil = (x) => (x === null) || (x === undefined);
var isNuf = (x) => (x === null) || (x === undefined) || (x === false);
var BITS = (v, or_ = 0, without_ = 0, and_ = -1) => ((v & ~without_) | or_) & and_;
var INT = (x) => parseInt(x);

function arr_fill(count, value) { return _.times(count, function(c) { return new_clone(value); }); }

var SELECT = (x) => document.querySelector(x); // querySelectorAll()[0]
var HTML =  function(id, text)
{
	var is_set = LEN(arguments) == 2;
	var el = SELECT('[id='+id+']');
	if(is_set) el.innerHTML = text;
	else return el.innerHTML;
};
var VALUE =  function(id, text)
{
	var is_set = LEN(arguments) == 2;
	var el = SELECT('[id='+id+']');
	if(is_set) el.value = text;	// Input Text value Property
	else return el.value;
};

//------------------------------------------
// DRAW API
//------------------------------------------
var
	DRAW_BITBLIT	= 1,	// { surface : , bitmap : , crect : , crect_uv : }
	DRAW_CLEAR		= 2,	// { surface : , crect : }
	DRAW_RESIZE		= 3,	// { surface : , crect : }
	DRAW_TEXT		= 4
;

// CRECT
var
	CR_X			= 0,
	CR_Y			= 1,
	CR_CX			= 2,
	CR_CY			= 3
;

var	struct_crect = [0,0,0,0];

var	struct_draw_bitblit =
{
	surface			: null,
	resource		: null,
	crect			: null,
	crect_uv		: null,
};

var	struct_draw_clear =
{
	surface			: null,
	crect			: null,
};

var	struct_draw_resize =
{
	surface			: null,
	crect			: null,
};

var	struct_draw_text =		// ALL ITEMS IS OPTIONAL
{
	surface			: null,
	text			: '',
	x				: 0,
	y				: 0,

	is_stroke		: false,
	stroke_width	: false,	// STROKE WIDTH
	stroke_color	: false,	// STROKE COLOR
	stroke_opacity	: false,	// STROKE OPACITY, RANGE: [0.0 .. 1.0] | false

	is_fill			: true,
	fill_color		: false,
	fill_opacity	: false,

	is_switch_font	: false,
	font			: false,
	font_height		: false,
};

var draw_api = function(id, P)
{
	var lib = P.surface.draw_api;

	switch(id)
	{
		case DRAW_BITBLIT:
			lib.drawImage(
					P.resource,
					P.crect_uv[CR_X],P.crect_uv[CR_Y],P.crect_uv[CR_CX],P.crect_uv[CR_CY],
					P.crect[CR_X],P.crect[CR_Y],P.crect[CR_CX],P.crect[CR_CY]);
		break;

		case DRAW_CLEAR:
			lib.clearRect.apply(lib, P.crect);
		break;

		case DRAW_RESIZE:
			P.surface.container.width = P.crect[2];
			P.surface.container.height = P.crect[3];
		break;

		case DRAW_TEXT:
			var _o = P;

			if(!isNuf(_o.stroke_width))				lib.lineWidth		= _o.stroke_width;
			if(!isNuf(_o.stroke_color))				lib.strokeStyle		= _o.stroke_color;
			if(!isNuf(_o.fill_color))				lib.fillStyle		= _o.fill_color;
			if(typeof _o.stroke_opacity == 'number')		lib.globalAlpha		= _o.stroke_opacity;
			// if(typeof _o.scale_type == 'number')	lib.imageSmoothingEnabled	= (_o.scale_type == 1)?false:true;

			if(!isNuf(_o.is_switch_font))			lib.font			= '' + _o.font_height + 'px ' + _o.font;

			if(!isNuf(_o.is_fill))		lib.fillText(_o.text, _o.x, _o.y);
			if(!isNuf(_o.is_stroke)) 	lib.strokeText(_o.text, _o.x, _o.y);
		break;
	}
}
//------------------------------------------

//------------------------------------------
// SOUND API
//------------------------------------------
var
	SOUND_PLAY		= 1,	// { resource : }
	SOUND_PAUSE		= 2,	// { resource : }
	SOUND_CONFIG	= 3		// { is_loop : }
;

var	struct_sound_config =
{
	resource		: null,
	is_loop			: false,
	volume			: false,	// The volume value 0.0 represents silent and 1.0 represents loudest.
};

var sound_api = function(id, P)
{
	try
	{
		switch(id)
		{
			case SOUND_PLAY:
				P.resource.play();
			break;

			case SOUND_PAUSE:
				P.resource.pause();
			break;

			case SOUND_CONFIG:
				if(!isNuf(P.loop)) P.resource.loop = is_loop;
				if(!isNuf(P.volume)) P.resource.volume = is_loop;
			break;
		}
	}
	catch(e)
	{
		console.log(e);
	}
}
//------------------------------------------
