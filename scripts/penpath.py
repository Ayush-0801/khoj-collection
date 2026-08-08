"""The hand-authored pen path for the Khoj signature, in Logo.png pixel space
(1080x1350). Each stroke is a list of waypoints the pen visits in order.
Used both to verify ink coverage and to emit the JS path data."""

STROKES = [
    # K: opening curl, then the stem descending to its hooked foot.
    [(422, 508), (440, 491), (462, 486), (471, 501), (456, 530), (430, 562),
     (409, 586), (404, 612), (410, 652), (416, 692), (418, 732), (421, 770),
     (428, 793), (435, 803)],
    # K: left flourish sweeping in, through the junction, out to the top arm.
    [(300, 662), (297, 690), (307, 709), (323, 718), (343, 713), (368, 690),
     (390, 662), (404, 634), (413, 608), (425, 592), (452, 568), (482, 539),
     (512, 511), (541, 486), (566, 466)],
    # h: up from the foot into the ascender, back down, shoulder arch, right
    # leg -> o -> connector up to the j. The ascender runs well below the
    # shoulder and ends in a foot at (447, 706); the pen pushes up through it
    # first, the way a cursive h is entered from the baseline. Cutting the
    # corner into the shoulder leaves the bottom of the h unwritten.
    [(447, 706), (458, 696), (470, 680), (482, 662), (494, 644), (505, 624),
     (516, 608), (528, 592), (541, 576), (556, 558), (580, 528), (605, 500),
     (627, 470), (655, 432),
     (628, 472), (598, 514), (568, 556), (538, 602), (518, 652),
     (512, 678), (518, 696), (532, 698), (548, 675), (562, 651), (578, 640),
     (592, 648), (600, 670), (602, 692),
     (612, 701), (627, 700), (641, 686), (650, 665), (645, 646), (631, 638),
     (618, 649), (612, 669), (617, 689), (629, 699),
     (651, 684), (681, 662), (711, 647), (740, 631)],
    # j: long descender sweeping down-left, hooking at the foot and returning.
    [(748, 626), (721, 660), (691, 700), (661, 745), (621, 800), (581, 855),
     (541, 905), (506, 945), (486, 962), (478, 957), (481, 939), (496, 914),
     (521, 884), (556, 849), (591, 817), (621, 789), (646, 767), (659, 754)],
    # j: the dot.
    [(756, 600), (764, 608)],
    # The enclosing circle, ending in the long tail at bottom-left.
    [(775, 700), (812, 672), (840, 635), (858, 592), (866, 545), (862, 495),
     (845, 443), (818, 400), (782, 362), (738, 332), (688, 312), (630, 300),
     (572, 296), (515, 298), (458, 308), (405, 325), (352, 350), (305, 382),
     (263, 420), (228, 466), (200, 518), (183, 575), (176, 635), (180, 698),
     (194, 760), (218, 818), (250, 872), (288, 920), (330, 962), (372, 998),
     (404, 1018), (416, 1026)],
]

# Where the final stroke lifts off - the weave thread is born here.
TAIL_TIP = STROKES[-1][-1]
