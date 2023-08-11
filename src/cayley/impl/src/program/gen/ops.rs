use crate::arrays::erasure::AnyArray;
use crate::arrays::routines;
use crate::arrays::Array;
use crate::arrays::ArrayIterable;
use crate::io::Reader;
use crate::program::exec::Stack;

pub const OPS: &[(fn(&mut Reader, &mut Stack), &str)] = &[
    (add_f32_1, "add_f32_1"),               // 0
    (add_f32_2, "add_f32_2"),               // 1
    (add_f32_3, "add_f32_3"),               // 2
    (add_f32_4, "add_f32_4"),               // 3
    (add_f32_5, "add_f32_5"),               // 4
    (add_f64_1, "add_f64_1"),               // 5
    (add_f64_2, "add_f64_2"),               // 6
    (add_f64_3, "add_f64_3"),               // 7
    (add_f64_4, "add_f64_4"),               // 8
    (add_f64_5, "add_f64_5"),               // 9
    (add_i16_1, "add_i16_1"),               // 10
    (add_i16_2, "add_i16_2"),               // 11
    (add_i16_3, "add_i16_3"),               // 12
    (add_i16_4, "add_i16_4"),               // 13
    (add_i16_5, "add_i16_5"),               // 14
    (add_i32_1, "add_i32_1"),               // 15
    (add_i32_2, "add_i32_2"),               // 16
    (add_i32_3, "add_i32_3"),               // 17
    (add_i32_4, "add_i32_4"),               // 18
    (add_i32_5, "add_i32_5"),               // 19
    (add_i64_1, "add_i64_1"),               // 20
    (add_i64_2, "add_i64_2"),               // 21
    (add_i64_3, "add_i64_3"),               // 22
    (add_i64_4, "add_i64_4"),               // 23
    (add_i64_5, "add_i64_5"),               // 24
    (add_i8_1, "add_i8_1"),                 // 25
    (add_i8_2, "add_i8_2"),                 // 26
    (add_i8_3, "add_i8_3"),                 // 27
    (add_i8_4, "add_i8_4"),                 // 28
    (add_i8_5, "add_i8_5"),                 // 29
    (add_u16_1, "add_u16_1"),               // 30
    (add_u16_2, "add_u16_2"),               // 31
    (add_u16_3, "add_u16_3"),               // 32
    (add_u16_4, "add_u16_4"),               // 33
    (add_u16_5, "add_u16_5"),               // 34
    (add_u32_1, "add_u32_1"),               // 35
    (add_u32_2, "add_u32_2"),               // 36
    (add_u32_3, "add_u32_3"),               // 37
    (add_u32_4, "add_u32_4"),               // 38
    (add_u32_5, "add_u32_5"),               // 39
    (add_u64_1, "add_u64_1"),               // 40
    (add_u64_2, "add_u64_2"),               // 41
    (add_u64_3, "add_u64_3"),               // 42
    (add_u64_4, "add_u64_4"),               // 43
    (add_u64_5, "add_u64_5"),               // 44
    (add_u8_1, "add_u8_1"),                 // 45
    (add_u8_2, "add_u8_2"),                 // 46
    (add_u8_3, "add_u8_3"),                 // 47
    (add_u8_4, "add_u8_4"),                 // 48
    (add_u8_5, "add_u8_5"),                 // 49
    (and_bool_1, "and_bool_1"),             // 50
    (and_bool_2, "and_bool_2"),             // 51
    (and_bool_3, "and_bool_3"),             // 52
    (and_bool_4, "and_bool_4"),             // 53
    (and_bool_5, "and_bool_5"),             // 54
    (bit_and_i16_1, "bit_and_i16_1"),       // 55
    (bit_and_i16_2, "bit_and_i16_2"),       // 56
    (bit_and_i16_3, "bit_and_i16_3"),       // 57
    (bit_and_i16_4, "bit_and_i16_4"),       // 58
    (bit_and_i16_5, "bit_and_i16_5"),       // 59
    (bit_and_i32_1, "bit_and_i32_1"),       // 60
    (bit_and_i32_2, "bit_and_i32_2"),       // 61
    (bit_and_i32_3, "bit_and_i32_3"),       // 62
    (bit_and_i32_4, "bit_and_i32_4"),       // 63
    (bit_and_i32_5, "bit_and_i32_5"),       // 64
    (bit_and_i64_1, "bit_and_i64_1"),       // 65
    (bit_and_i64_2, "bit_and_i64_2"),       // 66
    (bit_and_i64_3, "bit_and_i64_3"),       // 67
    (bit_and_i64_4, "bit_and_i64_4"),       // 68
    (bit_and_i64_5, "bit_and_i64_5"),       // 69
    (bit_and_i8_1, "bit_and_i8_1"),         // 70
    (bit_and_i8_2, "bit_and_i8_2"),         // 71
    (bit_and_i8_3, "bit_and_i8_3"),         // 72
    (bit_and_i8_4, "bit_and_i8_4"),         // 73
    (bit_and_i8_5, "bit_and_i8_5"),         // 74
    (bit_and_u16_1, "bit_and_u16_1"),       // 75
    (bit_and_u16_2, "bit_and_u16_2"),       // 76
    (bit_and_u16_3, "bit_and_u16_3"),       // 77
    (bit_and_u16_4, "bit_and_u16_4"),       // 78
    (bit_and_u16_5, "bit_and_u16_5"),       // 79
    (bit_and_u32_1, "bit_and_u32_1"),       // 80
    (bit_and_u32_2, "bit_and_u32_2"),       // 81
    (bit_and_u32_3, "bit_and_u32_3"),       // 82
    (bit_and_u32_4, "bit_and_u32_4"),       // 83
    (bit_and_u32_5, "bit_and_u32_5"),       // 84
    (bit_and_u64_1, "bit_and_u64_1"),       // 85
    (bit_and_u64_2, "bit_and_u64_2"),       // 86
    (bit_and_u64_3, "bit_and_u64_3"),       // 87
    (bit_and_u64_4, "bit_and_u64_4"),       // 88
    (bit_and_u64_5, "bit_and_u64_5"),       // 89
    (bit_and_u8_1, "bit_and_u8_1"),         // 90
    (bit_and_u8_2, "bit_and_u8_2"),         // 91
    (bit_and_u8_3, "bit_and_u8_3"),         // 92
    (bit_and_u8_4, "bit_and_u8_4"),         // 93
    (bit_and_u8_5, "bit_and_u8_5"),         // 94
    (bit_or_i16_1, "bit_or_i16_1"),         // 95
    (bit_or_i16_2, "bit_or_i16_2"),         // 96
    (bit_or_i16_3, "bit_or_i16_3"),         // 97
    (bit_or_i16_4, "bit_or_i16_4"),         // 98
    (bit_or_i16_5, "bit_or_i16_5"),         // 99
    (bit_or_i32_1, "bit_or_i32_1"),         // 100
    (bit_or_i32_2, "bit_or_i32_2"),         // 101
    (bit_or_i32_3, "bit_or_i32_3"),         // 102
    (bit_or_i32_4, "bit_or_i32_4"),         // 103
    (bit_or_i32_5, "bit_or_i32_5"),         // 104
    (bit_or_i64_1, "bit_or_i64_1"),         // 105
    (bit_or_i64_2, "bit_or_i64_2"),         // 106
    (bit_or_i64_3, "bit_or_i64_3"),         // 107
    (bit_or_i64_4, "bit_or_i64_4"),         // 108
    (bit_or_i64_5, "bit_or_i64_5"),         // 109
    (bit_or_i8_1, "bit_or_i8_1"),           // 110
    (bit_or_i8_2, "bit_or_i8_2"),           // 111
    (bit_or_i8_3, "bit_or_i8_3"),           // 112
    (bit_or_i8_4, "bit_or_i8_4"),           // 113
    (bit_or_i8_5, "bit_or_i8_5"),           // 114
    (bit_or_u16_1, "bit_or_u16_1"),         // 115
    (bit_or_u16_2, "bit_or_u16_2"),         // 116
    (bit_or_u16_3, "bit_or_u16_3"),         // 117
    (bit_or_u16_4, "bit_or_u16_4"),         // 118
    (bit_or_u16_5, "bit_or_u16_5"),         // 119
    (bit_or_u32_1, "bit_or_u32_1"),         // 120
    (bit_or_u32_2, "bit_or_u32_2"),         // 121
    (bit_or_u32_3, "bit_or_u32_3"),         // 122
    (bit_or_u32_4, "bit_or_u32_4"),         // 123
    (bit_or_u32_5, "bit_or_u32_5"),         // 124
    (bit_or_u64_1, "bit_or_u64_1"),         // 125
    (bit_or_u64_2, "bit_or_u64_2"),         // 126
    (bit_or_u64_3, "bit_or_u64_3"),         // 127
    (bit_or_u64_4, "bit_or_u64_4"),         // 128
    (bit_or_u64_5, "bit_or_u64_5"),         // 129
    (bit_or_u8_1, "bit_or_u8_1"),           // 130
    (bit_or_u8_2, "bit_or_u8_2"),           // 131
    (bit_or_u8_3, "bit_or_u8_3"),           // 132
    (bit_or_u8_4, "bit_or_u8_4"),           // 133
    (bit_or_u8_5, "bit_or_u8_5"),           // 134
    (bit_xor_i16_1, "bit_xor_i16_1"),       // 135
    (bit_xor_i16_2, "bit_xor_i16_2"),       // 136
    (bit_xor_i16_3, "bit_xor_i16_3"),       // 137
    (bit_xor_i16_4, "bit_xor_i16_4"),       // 138
    (bit_xor_i16_5, "bit_xor_i16_5"),       // 139
    (bit_xor_i32_1, "bit_xor_i32_1"),       // 140
    (bit_xor_i32_2, "bit_xor_i32_2"),       // 141
    (bit_xor_i32_3, "bit_xor_i32_3"),       // 142
    (bit_xor_i32_4, "bit_xor_i32_4"),       // 143
    (bit_xor_i32_5, "bit_xor_i32_5"),       // 144
    (bit_xor_i64_1, "bit_xor_i64_1"),       // 145
    (bit_xor_i64_2, "bit_xor_i64_2"),       // 146
    (bit_xor_i64_3, "bit_xor_i64_3"),       // 147
    (bit_xor_i64_4, "bit_xor_i64_4"),       // 148
    (bit_xor_i64_5, "bit_xor_i64_5"),       // 149
    (bit_xor_i8_1, "bit_xor_i8_1"),         // 150
    (bit_xor_i8_2, "bit_xor_i8_2"),         // 151
    (bit_xor_i8_3, "bit_xor_i8_3"),         // 152
    (bit_xor_i8_4, "bit_xor_i8_4"),         // 153
    (bit_xor_i8_5, "bit_xor_i8_5"),         // 154
    (bit_xor_u16_1, "bit_xor_u16_1"),       // 155
    (bit_xor_u16_2, "bit_xor_u16_2"),       // 156
    (bit_xor_u16_3, "bit_xor_u16_3"),       // 157
    (bit_xor_u16_4, "bit_xor_u16_4"),       // 158
    (bit_xor_u16_5, "bit_xor_u16_5"),       // 159
    (bit_xor_u32_1, "bit_xor_u32_1"),       // 160
    (bit_xor_u32_2, "bit_xor_u32_2"),       // 161
    (bit_xor_u32_3, "bit_xor_u32_3"),       // 162
    (bit_xor_u32_4, "bit_xor_u32_4"),       // 163
    (bit_xor_u32_5, "bit_xor_u32_5"),       // 164
    (bit_xor_u64_1, "bit_xor_u64_1"),       // 165
    (bit_xor_u64_2, "bit_xor_u64_2"),       // 166
    (bit_xor_u64_3, "bit_xor_u64_3"),       // 167
    (bit_xor_u64_4, "bit_xor_u64_4"),       // 168
    (bit_xor_u64_5, "bit_xor_u64_5"),       // 169
    (bit_xor_u8_1, "bit_xor_u8_1"),         // 170
    (bit_xor_u8_2, "bit_xor_u8_2"),         // 171
    (bit_xor_u8_3, "bit_xor_u8_3"),         // 172
    (bit_xor_u8_4, "bit_xor_u8_4"),         // 173
    (bit_xor_u8_5, "bit_xor_u8_5"),         // 174
    (cast_f32_f64_1, "cast_f32_f64_1"),     // 175
    (cast_f32_f64_2, "cast_f32_f64_2"),     // 176
    (cast_f32_f64_3, "cast_f32_f64_3"),     // 177
    (cast_f32_f64_4, "cast_f32_f64_4"),     // 178
    (cast_f32_f64_5, "cast_f32_f64_5"),     // 179
    (cast_f32_i16_1, "cast_f32_i16_1"),     // 180
    (cast_f32_i16_2, "cast_f32_i16_2"),     // 181
    (cast_f32_i16_3, "cast_f32_i16_3"),     // 182
    (cast_f32_i16_4, "cast_f32_i16_4"),     // 183
    (cast_f32_i16_5, "cast_f32_i16_5"),     // 184
    (cast_f32_i32_1, "cast_f32_i32_1"),     // 185
    (cast_f32_i32_2, "cast_f32_i32_2"),     // 186
    (cast_f32_i32_3, "cast_f32_i32_3"),     // 187
    (cast_f32_i32_4, "cast_f32_i32_4"),     // 188
    (cast_f32_i32_5, "cast_f32_i32_5"),     // 189
    (cast_f32_i64_1, "cast_f32_i64_1"),     // 190
    (cast_f32_i64_2, "cast_f32_i64_2"),     // 191
    (cast_f32_i64_3, "cast_f32_i64_3"),     // 192
    (cast_f32_i64_4, "cast_f32_i64_4"),     // 193
    (cast_f32_i64_5, "cast_f32_i64_5"),     // 194
    (cast_f32_i8_1, "cast_f32_i8_1"),       // 195
    (cast_f32_i8_2, "cast_f32_i8_2"),       // 196
    (cast_f32_i8_3, "cast_f32_i8_3"),       // 197
    (cast_f32_i8_4, "cast_f32_i8_4"),       // 198
    (cast_f32_i8_5, "cast_f32_i8_5"),       // 199
    (cast_f32_u16_1, "cast_f32_u16_1"),     // 200
    (cast_f32_u16_2, "cast_f32_u16_2"),     // 201
    (cast_f32_u16_3, "cast_f32_u16_3"),     // 202
    (cast_f32_u16_4, "cast_f32_u16_4"),     // 203
    (cast_f32_u16_5, "cast_f32_u16_5"),     // 204
    (cast_f32_u32_1, "cast_f32_u32_1"),     // 205
    (cast_f32_u32_2, "cast_f32_u32_2"),     // 206
    (cast_f32_u32_3, "cast_f32_u32_3"),     // 207
    (cast_f32_u32_4, "cast_f32_u32_4"),     // 208
    (cast_f32_u32_5, "cast_f32_u32_5"),     // 209
    (cast_f32_u64_1, "cast_f32_u64_1"),     // 210
    (cast_f32_u64_2, "cast_f32_u64_2"),     // 211
    (cast_f32_u64_3, "cast_f32_u64_3"),     // 212
    (cast_f32_u64_4, "cast_f32_u64_4"),     // 213
    (cast_f32_u64_5, "cast_f32_u64_5"),     // 214
    (cast_f32_u8_1, "cast_f32_u8_1"),       // 215
    (cast_f32_u8_2, "cast_f32_u8_2"),       // 216
    (cast_f32_u8_3, "cast_f32_u8_3"),       // 217
    (cast_f32_u8_4, "cast_f32_u8_4"),       // 218
    (cast_f32_u8_5, "cast_f32_u8_5"),       // 219
    (cast_f64_f32_1, "cast_f64_f32_1"),     // 220
    (cast_f64_f32_2, "cast_f64_f32_2"),     // 221
    (cast_f64_f32_3, "cast_f64_f32_3"),     // 222
    (cast_f64_f32_4, "cast_f64_f32_4"),     // 223
    (cast_f64_f32_5, "cast_f64_f32_5"),     // 224
    (cast_f64_i16_1, "cast_f64_i16_1"),     // 225
    (cast_f64_i16_2, "cast_f64_i16_2"),     // 226
    (cast_f64_i16_3, "cast_f64_i16_3"),     // 227
    (cast_f64_i16_4, "cast_f64_i16_4"),     // 228
    (cast_f64_i16_5, "cast_f64_i16_5"),     // 229
    (cast_f64_i32_1, "cast_f64_i32_1"),     // 230
    (cast_f64_i32_2, "cast_f64_i32_2"),     // 231
    (cast_f64_i32_3, "cast_f64_i32_3"),     // 232
    (cast_f64_i32_4, "cast_f64_i32_4"),     // 233
    (cast_f64_i32_5, "cast_f64_i32_5"),     // 234
    (cast_f64_i64_1, "cast_f64_i64_1"),     // 235
    (cast_f64_i64_2, "cast_f64_i64_2"),     // 236
    (cast_f64_i64_3, "cast_f64_i64_3"),     // 237
    (cast_f64_i64_4, "cast_f64_i64_4"),     // 238
    (cast_f64_i64_5, "cast_f64_i64_5"),     // 239
    (cast_f64_i8_1, "cast_f64_i8_1"),       // 240
    (cast_f64_i8_2, "cast_f64_i8_2"),       // 241
    (cast_f64_i8_3, "cast_f64_i8_3"),       // 242
    (cast_f64_i8_4, "cast_f64_i8_4"),       // 243
    (cast_f64_i8_5, "cast_f64_i8_5"),       // 244
    (cast_f64_u16_1, "cast_f64_u16_1"),     // 245
    (cast_f64_u16_2, "cast_f64_u16_2"),     // 246
    (cast_f64_u16_3, "cast_f64_u16_3"),     // 247
    (cast_f64_u16_4, "cast_f64_u16_4"),     // 248
    (cast_f64_u16_5, "cast_f64_u16_5"),     // 249
    (cast_f64_u32_1, "cast_f64_u32_1"),     // 250
    (cast_f64_u32_2, "cast_f64_u32_2"),     // 251
    (cast_f64_u32_3, "cast_f64_u32_3"),     // 252
    (cast_f64_u32_4, "cast_f64_u32_4"),     // 253
    (cast_f64_u32_5, "cast_f64_u32_5"),     // 254
    (cast_f64_u64_1, "cast_f64_u64_1"),     // 255
    (cast_f64_u64_2, "cast_f64_u64_2"),     // 256
    (cast_f64_u64_3, "cast_f64_u64_3"),     // 257
    (cast_f64_u64_4, "cast_f64_u64_4"),     // 258
    (cast_f64_u64_5, "cast_f64_u64_5"),     // 259
    (cast_f64_u8_1, "cast_f64_u8_1"),       // 260
    (cast_f64_u8_2, "cast_f64_u8_2"),       // 261
    (cast_f64_u8_3, "cast_f64_u8_3"),       // 262
    (cast_f64_u8_4, "cast_f64_u8_4"),       // 263
    (cast_f64_u8_5, "cast_f64_u8_5"),       // 264
    (cast_i16_bool_1, "cast_i16_bool_1"),   // 265
    (cast_i16_bool_2, "cast_i16_bool_2"),   // 266
    (cast_i16_bool_3, "cast_i16_bool_3"),   // 267
    (cast_i16_bool_4, "cast_i16_bool_4"),   // 268
    (cast_i16_bool_5, "cast_i16_bool_5"),   // 269
    (cast_i16_f32_1, "cast_i16_f32_1"),     // 270
    (cast_i16_f32_2, "cast_i16_f32_2"),     // 271
    (cast_i16_f32_3, "cast_i16_f32_3"),     // 272
    (cast_i16_f32_4, "cast_i16_f32_4"),     // 273
    (cast_i16_f32_5, "cast_i16_f32_5"),     // 274
    (cast_i16_f64_1, "cast_i16_f64_1"),     // 275
    (cast_i16_f64_2, "cast_i16_f64_2"),     // 276
    (cast_i16_f64_3, "cast_i16_f64_3"),     // 277
    (cast_i16_f64_4, "cast_i16_f64_4"),     // 278
    (cast_i16_f64_5, "cast_i16_f64_5"),     // 279
    (cast_i16_i32_1, "cast_i16_i32_1"),     // 280
    (cast_i16_i32_2, "cast_i16_i32_2"),     // 281
    (cast_i16_i32_3, "cast_i16_i32_3"),     // 282
    (cast_i16_i32_4, "cast_i16_i32_4"),     // 283
    (cast_i16_i32_5, "cast_i16_i32_5"),     // 284
    (cast_i16_i64_1, "cast_i16_i64_1"),     // 285
    (cast_i16_i64_2, "cast_i16_i64_2"),     // 286
    (cast_i16_i64_3, "cast_i16_i64_3"),     // 287
    (cast_i16_i64_4, "cast_i16_i64_4"),     // 288
    (cast_i16_i64_5, "cast_i16_i64_5"),     // 289
    (cast_i16_i8_1, "cast_i16_i8_1"),       // 290
    (cast_i16_i8_2, "cast_i16_i8_2"),       // 291
    (cast_i16_i8_3, "cast_i16_i8_3"),       // 292
    (cast_i16_i8_4, "cast_i16_i8_4"),       // 293
    (cast_i16_i8_5, "cast_i16_i8_5"),       // 294
    (cast_i16_u16_1, "cast_i16_u16_1"),     // 295
    (cast_i16_u16_2, "cast_i16_u16_2"),     // 296
    (cast_i16_u16_3, "cast_i16_u16_3"),     // 297
    (cast_i16_u16_4, "cast_i16_u16_4"),     // 298
    (cast_i16_u16_5, "cast_i16_u16_5"),     // 299
    (cast_i16_u32_1, "cast_i16_u32_1"),     // 300
    (cast_i16_u32_2, "cast_i16_u32_2"),     // 301
    (cast_i16_u32_3, "cast_i16_u32_3"),     // 302
    (cast_i16_u32_4, "cast_i16_u32_4"),     // 303
    (cast_i16_u32_5, "cast_i16_u32_5"),     // 304
    (cast_i16_u64_1, "cast_i16_u64_1"),     // 305
    (cast_i16_u64_2, "cast_i16_u64_2"),     // 306
    (cast_i16_u64_3, "cast_i16_u64_3"),     // 307
    (cast_i16_u64_4, "cast_i16_u64_4"),     // 308
    (cast_i16_u64_5, "cast_i16_u64_5"),     // 309
    (cast_i16_u8_1, "cast_i16_u8_1"),       // 310
    (cast_i16_u8_2, "cast_i16_u8_2"),       // 311
    (cast_i16_u8_3, "cast_i16_u8_3"),       // 312
    (cast_i16_u8_4, "cast_i16_u8_4"),       // 313
    (cast_i16_u8_5, "cast_i16_u8_5"),       // 314
    (cast_i32_bool_1, "cast_i32_bool_1"),   // 315
    (cast_i32_bool_2, "cast_i32_bool_2"),   // 316
    (cast_i32_bool_3, "cast_i32_bool_3"),   // 317
    (cast_i32_bool_4, "cast_i32_bool_4"),   // 318
    (cast_i32_bool_5, "cast_i32_bool_5"),   // 319
    (cast_i32_f32_1, "cast_i32_f32_1"),     // 320
    (cast_i32_f32_2, "cast_i32_f32_2"),     // 321
    (cast_i32_f32_3, "cast_i32_f32_3"),     // 322
    (cast_i32_f32_4, "cast_i32_f32_4"),     // 323
    (cast_i32_f32_5, "cast_i32_f32_5"),     // 324
    (cast_i32_f64_1, "cast_i32_f64_1"),     // 325
    (cast_i32_f64_2, "cast_i32_f64_2"),     // 326
    (cast_i32_f64_3, "cast_i32_f64_3"),     // 327
    (cast_i32_f64_4, "cast_i32_f64_4"),     // 328
    (cast_i32_f64_5, "cast_i32_f64_5"),     // 329
    (cast_i32_i16_1, "cast_i32_i16_1"),     // 330
    (cast_i32_i16_2, "cast_i32_i16_2"),     // 331
    (cast_i32_i16_3, "cast_i32_i16_3"),     // 332
    (cast_i32_i16_4, "cast_i32_i16_4"),     // 333
    (cast_i32_i16_5, "cast_i32_i16_5"),     // 334
    (cast_i32_i64_1, "cast_i32_i64_1"),     // 335
    (cast_i32_i64_2, "cast_i32_i64_2"),     // 336
    (cast_i32_i64_3, "cast_i32_i64_3"),     // 337
    (cast_i32_i64_4, "cast_i32_i64_4"),     // 338
    (cast_i32_i64_5, "cast_i32_i64_5"),     // 339
    (cast_i32_i8_1, "cast_i32_i8_1"),       // 340
    (cast_i32_i8_2, "cast_i32_i8_2"),       // 341
    (cast_i32_i8_3, "cast_i32_i8_3"),       // 342
    (cast_i32_i8_4, "cast_i32_i8_4"),       // 343
    (cast_i32_i8_5, "cast_i32_i8_5"),       // 344
    (cast_i32_u16_1, "cast_i32_u16_1"),     // 345
    (cast_i32_u16_2, "cast_i32_u16_2"),     // 346
    (cast_i32_u16_3, "cast_i32_u16_3"),     // 347
    (cast_i32_u16_4, "cast_i32_u16_4"),     // 348
    (cast_i32_u16_5, "cast_i32_u16_5"),     // 349
    (cast_i32_u32_1, "cast_i32_u32_1"),     // 350
    (cast_i32_u32_2, "cast_i32_u32_2"),     // 351
    (cast_i32_u32_3, "cast_i32_u32_3"),     // 352
    (cast_i32_u32_4, "cast_i32_u32_4"),     // 353
    (cast_i32_u32_5, "cast_i32_u32_5"),     // 354
    (cast_i32_u64_1, "cast_i32_u64_1"),     // 355
    (cast_i32_u64_2, "cast_i32_u64_2"),     // 356
    (cast_i32_u64_3, "cast_i32_u64_3"),     // 357
    (cast_i32_u64_4, "cast_i32_u64_4"),     // 358
    (cast_i32_u64_5, "cast_i32_u64_5"),     // 359
    (cast_i32_u8_1, "cast_i32_u8_1"),       // 360
    (cast_i32_u8_2, "cast_i32_u8_2"),       // 361
    (cast_i32_u8_3, "cast_i32_u8_3"),       // 362
    (cast_i32_u8_4, "cast_i32_u8_4"),       // 363
    (cast_i32_u8_5, "cast_i32_u8_5"),       // 364
    (cast_i64_bool_1, "cast_i64_bool_1"),   // 365
    (cast_i64_bool_2, "cast_i64_bool_2"),   // 366
    (cast_i64_bool_3, "cast_i64_bool_3"),   // 367
    (cast_i64_bool_4, "cast_i64_bool_4"),   // 368
    (cast_i64_bool_5, "cast_i64_bool_5"),   // 369
    (cast_i64_f32_1, "cast_i64_f32_1"),     // 370
    (cast_i64_f32_2, "cast_i64_f32_2"),     // 371
    (cast_i64_f32_3, "cast_i64_f32_3"),     // 372
    (cast_i64_f32_4, "cast_i64_f32_4"),     // 373
    (cast_i64_f32_5, "cast_i64_f32_5"),     // 374
    (cast_i64_f64_1, "cast_i64_f64_1"),     // 375
    (cast_i64_f64_2, "cast_i64_f64_2"),     // 376
    (cast_i64_f64_3, "cast_i64_f64_3"),     // 377
    (cast_i64_f64_4, "cast_i64_f64_4"),     // 378
    (cast_i64_f64_5, "cast_i64_f64_5"),     // 379
    (cast_i64_i16_1, "cast_i64_i16_1"),     // 380
    (cast_i64_i16_2, "cast_i64_i16_2"),     // 381
    (cast_i64_i16_3, "cast_i64_i16_3"),     // 382
    (cast_i64_i16_4, "cast_i64_i16_4"),     // 383
    (cast_i64_i16_5, "cast_i64_i16_5"),     // 384
    (cast_i64_i32_1, "cast_i64_i32_1"),     // 385
    (cast_i64_i32_2, "cast_i64_i32_2"),     // 386
    (cast_i64_i32_3, "cast_i64_i32_3"),     // 387
    (cast_i64_i32_4, "cast_i64_i32_4"),     // 388
    (cast_i64_i32_5, "cast_i64_i32_5"),     // 389
    (cast_i64_i8_1, "cast_i64_i8_1"),       // 390
    (cast_i64_i8_2, "cast_i64_i8_2"),       // 391
    (cast_i64_i8_3, "cast_i64_i8_3"),       // 392
    (cast_i64_i8_4, "cast_i64_i8_4"),       // 393
    (cast_i64_i8_5, "cast_i64_i8_5"),       // 394
    (cast_i64_u16_1, "cast_i64_u16_1"),     // 395
    (cast_i64_u16_2, "cast_i64_u16_2"),     // 396
    (cast_i64_u16_3, "cast_i64_u16_3"),     // 397
    (cast_i64_u16_4, "cast_i64_u16_4"),     // 398
    (cast_i64_u16_5, "cast_i64_u16_5"),     // 399
    (cast_i64_u32_1, "cast_i64_u32_1"),     // 400
    (cast_i64_u32_2, "cast_i64_u32_2"),     // 401
    (cast_i64_u32_3, "cast_i64_u32_3"),     // 402
    (cast_i64_u32_4, "cast_i64_u32_4"),     // 403
    (cast_i64_u32_5, "cast_i64_u32_5"),     // 404
    (cast_i64_u64_1, "cast_i64_u64_1"),     // 405
    (cast_i64_u64_2, "cast_i64_u64_2"),     // 406
    (cast_i64_u64_3, "cast_i64_u64_3"),     // 407
    (cast_i64_u64_4, "cast_i64_u64_4"),     // 408
    (cast_i64_u64_5, "cast_i64_u64_5"),     // 409
    (cast_i64_u8_1, "cast_i64_u8_1"),       // 410
    (cast_i64_u8_2, "cast_i64_u8_2"),       // 411
    (cast_i64_u8_3, "cast_i64_u8_3"),       // 412
    (cast_i64_u8_4, "cast_i64_u8_4"),       // 413
    (cast_i64_u8_5, "cast_i64_u8_5"),       // 414
    (cast_i8_bool_1, "cast_i8_bool_1"),     // 415
    (cast_i8_bool_2, "cast_i8_bool_2"),     // 416
    (cast_i8_bool_3, "cast_i8_bool_3"),     // 417
    (cast_i8_bool_4, "cast_i8_bool_4"),     // 418
    (cast_i8_bool_5, "cast_i8_bool_5"),     // 419
    (cast_i8_f32_1, "cast_i8_f32_1"),       // 420
    (cast_i8_f32_2, "cast_i8_f32_2"),       // 421
    (cast_i8_f32_3, "cast_i8_f32_3"),       // 422
    (cast_i8_f32_4, "cast_i8_f32_4"),       // 423
    (cast_i8_f32_5, "cast_i8_f32_5"),       // 424
    (cast_i8_f64_1, "cast_i8_f64_1"),       // 425
    (cast_i8_f64_2, "cast_i8_f64_2"),       // 426
    (cast_i8_f64_3, "cast_i8_f64_3"),       // 427
    (cast_i8_f64_4, "cast_i8_f64_4"),       // 428
    (cast_i8_f64_5, "cast_i8_f64_5"),       // 429
    (cast_i8_i16_1, "cast_i8_i16_1"),       // 430
    (cast_i8_i16_2, "cast_i8_i16_2"),       // 431
    (cast_i8_i16_3, "cast_i8_i16_3"),       // 432
    (cast_i8_i16_4, "cast_i8_i16_4"),       // 433
    (cast_i8_i16_5, "cast_i8_i16_5"),       // 434
    (cast_i8_i32_1, "cast_i8_i32_1"),       // 435
    (cast_i8_i32_2, "cast_i8_i32_2"),       // 436
    (cast_i8_i32_3, "cast_i8_i32_3"),       // 437
    (cast_i8_i32_4, "cast_i8_i32_4"),       // 438
    (cast_i8_i32_5, "cast_i8_i32_5"),       // 439
    (cast_i8_i64_1, "cast_i8_i64_1"),       // 440
    (cast_i8_i64_2, "cast_i8_i64_2"),       // 441
    (cast_i8_i64_3, "cast_i8_i64_3"),       // 442
    (cast_i8_i64_4, "cast_i8_i64_4"),       // 443
    (cast_i8_i64_5, "cast_i8_i64_5"),       // 444
    (cast_i8_u16_1, "cast_i8_u16_1"),       // 445
    (cast_i8_u16_2, "cast_i8_u16_2"),       // 446
    (cast_i8_u16_3, "cast_i8_u16_3"),       // 447
    (cast_i8_u16_4, "cast_i8_u16_4"),       // 448
    (cast_i8_u16_5, "cast_i8_u16_5"),       // 449
    (cast_i8_u32_1, "cast_i8_u32_1"),       // 450
    (cast_i8_u32_2, "cast_i8_u32_2"),       // 451
    (cast_i8_u32_3, "cast_i8_u32_3"),       // 452
    (cast_i8_u32_4, "cast_i8_u32_4"),       // 453
    (cast_i8_u32_5, "cast_i8_u32_5"),       // 454
    (cast_i8_u64_1, "cast_i8_u64_1"),       // 455
    (cast_i8_u64_2, "cast_i8_u64_2"),       // 456
    (cast_i8_u64_3, "cast_i8_u64_3"),       // 457
    (cast_i8_u64_4, "cast_i8_u64_4"),       // 458
    (cast_i8_u64_5, "cast_i8_u64_5"),       // 459
    (cast_i8_u8_1, "cast_i8_u8_1"),         // 460
    (cast_i8_u8_2, "cast_i8_u8_2"),         // 461
    (cast_i8_u8_3, "cast_i8_u8_3"),         // 462
    (cast_i8_u8_4, "cast_i8_u8_4"),         // 463
    (cast_i8_u8_5, "cast_i8_u8_5"),         // 464
    (cast_u16_bool_1, "cast_u16_bool_1"),   // 465
    (cast_u16_bool_2, "cast_u16_bool_2"),   // 466
    (cast_u16_bool_3, "cast_u16_bool_3"),   // 467
    (cast_u16_bool_4, "cast_u16_bool_4"),   // 468
    (cast_u16_bool_5, "cast_u16_bool_5"),   // 469
    (cast_u16_f32_1, "cast_u16_f32_1"),     // 470
    (cast_u16_f32_2, "cast_u16_f32_2"),     // 471
    (cast_u16_f32_3, "cast_u16_f32_3"),     // 472
    (cast_u16_f32_4, "cast_u16_f32_4"),     // 473
    (cast_u16_f32_5, "cast_u16_f32_5"),     // 474
    (cast_u16_f64_1, "cast_u16_f64_1"),     // 475
    (cast_u16_f64_2, "cast_u16_f64_2"),     // 476
    (cast_u16_f64_3, "cast_u16_f64_3"),     // 477
    (cast_u16_f64_4, "cast_u16_f64_4"),     // 478
    (cast_u16_f64_5, "cast_u16_f64_5"),     // 479
    (cast_u16_i16_1, "cast_u16_i16_1"),     // 480
    (cast_u16_i16_2, "cast_u16_i16_2"),     // 481
    (cast_u16_i16_3, "cast_u16_i16_3"),     // 482
    (cast_u16_i16_4, "cast_u16_i16_4"),     // 483
    (cast_u16_i16_5, "cast_u16_i16_5"),     // 484
    (cast_u16_i32_1, "cast_u16_i32_1"),     // 485
    (cast_u16_i32_2, "cast_u16_i32_2"),     // 486
    (cast_u16_i32_3, "cast_u16_i32_3"),     // 487
    (cast_u16_i32_4, "cast_u16_i32_4"),     // 488
    (cast_u16_i32_5, "cast_u16_i32_5"),     // 489
    (cast_u16_i64_1, "cast_u16_i64_1"),     // 490
    (cast_u16_i64_2, "cast_u16_i64_2"),     // 491
    (cast_u16_i64_3, "cast_u16_i64_3"),     // 492
    (cast_u16_i64_4, "cast_u16_i64_4"),     // 493
    (cast_u16_i64_5, "cast_u16_i64_5"),     // 494
    (cast_u16_i8_1, "cast_u16_i8_1"),       // 495
    (cast_u16_i8_2, "cast_u16_i8_2"),       // 496
    (cast_u16_i8_3, "cast_u16_i8_3"),       // 497
    (cast_u16_i8_4, "cast_u16_i8_4"),       // 498
    (cast_u16_i8_5, "cast_u16_i8_5"),       // 499
    (cast_u16_u32_1, "cast_u16_u32_1"),     // 500
    (cast_u16_u32_2, "cast_u16_u32_2"),     // 501
    (cast_u16_u32_3, "cast_u16_u32_3"),     // 502
    (cast_u16_u32_4, "cast_u16_u32_4"),     // 503
    (cast_u16_u32_5, "cast_u16_u32_5"),     // 504
    (cast_u16_u64_1, "cast_u16_u64_1"),     // 505
    (cast_u16_u64_2, "cast_u16_u64_2"),     // 506
    (cast_u16_u64_3, "cast_u16_u64_3"),     // 507
    (cast_u16_u64_4, "cast_u16_u64_4"),     // 508
    (cast_u16_u64_5, "cast_u16_u64_5"),     // 509
    (cast_u16_u8_1, "cast_u16_u8_1"),       // 510
    (cast_u16_u8_2, "cast_u16_u8_2"),       // 511
    (cast_u16_u8_3, "cast_u16_u8_3"),       // 512
    (cast_u16_u8_4, "cast_u16_u8_4"),       // 513
    (cast_u16_u8_5, "cast_u16_u8_5"),       // 514
    (cast_u32_bool_1, "cast_u32_bool_1"),   // 515
    (cast_u32_bool_2, "cast_u32_bool_2"),   // 516
    (cast_u32_bool_3, "cast_u32_bool_3"),   // 517
    (cast_u32_bool_4, "cast_u32_bool_4"),   // 518
    (cast_u32_bool_5, "cast_u32_bool_5"),   // 519
    (cast_u32_f32_1, "cast_u32_f32_1"),     // 520
    (cast_u32_f32_2, "cast_u32_f32_2"),     // 521
    (cast_u32_f32_3, "cast_u32_f32_3"),     // 522
    (cast_u32_f32_4, "cast_u32_f32_4"),     // 523
    (cast_u32_f32_5, "cast_u32_f32_5"),     // 524
    (cast_u32_f64_1, "cast_u32_f64_1"),     // 525
    (cast_u32_f64_2, "cast_u32_f64_2"),     // 526
    (cast_u32_f64_3, "cast_u32_f64_3"),     // 527
    (cast_u32_f64_4, "cast_u32_f64_4"),     // 528
    (cast_u32_f64_5, "cast_u32_f64_5"),     // 529
    (cast_u32_i16_1, "cast_u32_i16_1"),     // 530
    (cast_u32_i16_2, "cast_u32_i16_2"),     // 531
    (cast_u32_i16_3, "cast_u32_i16_3"),     // 532
    (cast_u32_i16_4, "cast_u32_i16_4"),     // 533
    (cast_u32_i16_5, "cast_u32_i16_5"),     // 534
    (cast_u32_i32_1, "cast_u32_i32_1"),     // 535
    (cast_u32_i32_2, "cast_u32_i32_2"),     // 536
    (cast_u32_i32_3, "cast_u32_i32_3"),     // 537
    (cast_u32_i32_4, "cast_u32_i32_4"),     // 538
    (cast_u32_i32_5, "cast_u32_i32_5"),     // 539
    (cast_u32_i64_1, "cast_u32_i64_1"),     // 540
    (cast_u32_i64_2, "cast_u32_i64_2"),     // 541
    (cast_u32_i64_3, "cast_u32_i64_3"),     // 542
    (cast_u32_i64_4, "cast_u32_i64_4"),     // 543
    (cast_u32_i64_5, "cast_u32_i64_5"),     // 544
    (cast_u32_i8_1, "cast_u32_i8_1"),       // 545
    (cast_u32_i8_2, "cast_u32_i8_2"),       // 546
    (cast_u32_i8_3, "cast_u32_i8_3"),       // 547
    (cast_u32_i8_4, "cast_u32_i8_4"),       // 548
    (cast_u32_i8_5, "cast_u32_i8_5"),       // 549
    (cast_u32_u16_1, "cast_u32_u16_1"),     // 550
    (cast_u32_u16_2, "cast_u32_u16_2"),     // 551
    (cast_u32_u16_3, "cast_u32_u16_3"),     // 552
    (cast_u32_u16_4, "cast_u32_u16_4"),     // 553
    (cast_u32_u16_5, "cast_u32_u16_5"),     // 554
    (cast_u32_u64_1, "cast_u32_u64_1"),     // 555
    (cast_u32_u64_2, "cast_u32_u64_2"),     // 556
    (cast_u32_u64_3, "cast_u32_u64_3"),     // 557
    (cast_u32_u64_4, "cast_u32_u64_4"),     // 558
    (cast_u32_u64_5, "cast_u32_u64_5"),     // 559
    (cast_u32_u8_1, "cast_u32_u8_1"),       // 560
    (cast_u32_u8_2, "cast_u32_u8_2"),       // 561
    (cast_u32_u8_3, "cast_u32_u8_3"),       // 562
    (cast_u32_u8_4, "cast_u32_u8_4"),       // 563
    (cast_u32_u8_5, "cast_u32_u8_5"),       // 564
    (cast_u64_bool_1, "cast_u64_bool_1"),   // 565
    (cast_u64_bool_2, "cast_u64_bool_2"),   // 566
    (cast_u64_bool_3, "cast_u64_bool_3"),   // 567
    (cast_u64_bool_4, "cast_u64_bool_4"),   // 568
    (cast_u64_bool_5, "cast_u64_bool_5"),   // 569
    (cast_u64_f32_1, "cast_u64_f32_1"),     // 570
    (cast_u64_f32_2, "cast_u64_f32_2"),     // 571
    (cast_u64_f32_3, "cast_u64_f32_3"),     // 572
    (cast_u64_f32_4, "cast_u64_f32_4"),     // 573
    (cast_u64_f32_5, "cast_u64_f32_5"),     // 574
    (cast_u64_f64_1, "cast_u64_f64_1"),     // 575
    (cast_u64_f64_2, "cast_u64_f64_2"),     // 576
    (cast_u64_f64_3, "cast_u64_f64_3"),     // 577
    (cast_u64_f64_4, "cast_u64_f64_4"),     // 578
    (cast_u64_f64_5, "cast_u64_f64_5"),     // 579
    (cast_u64_i16_1, "cast_u64_i16_1"),     // 580
    (cast_u64_i16_2, "cast_u64_i16_2"),     // 581
    (cast_u64_i16_3, "cast_u64_i16_3"),     // 582
    (cast_u64_i16_4, "cast_u64_i16_4"),     // 583
    (cast_u64_i16_5, "cast_u64_i16_5"),     // 584
    (cast_u64_i32_1, "cast_u64_i32_1"),     // 585
    (cast_u64_i32_2, "cast_u64_i32_2"),     // 586
    (cast_u64_i32_3, "cast_u64_i32_3"),     // 587
    (cast_u64_i32_4, "cast_u64_i32_4"),     // 588
    (cast_u64_i32_5, "cast_u64_i32_5"),     // 589
    (cast_u64_i64_1, "cast_u64_i64_1"),     // 590
    (cast_u64_i64_2, "cast_u64_i64_2"),     // 591
    (cast_u64_i64_3, "cast_u64_i64_3"),     // 592
    (cast_u64_i64_4, "cast_u64_i64_4"),     // 593
    (cast_u64_i64_5, "cast_u64_i64_5"),     // 594
    (cast_u64_i8_1, "cast_u64_i8_1"),       // 595
    (cast_u64_i8_2, "cast_u64_i8_2"),       // 596
    (cast_u64_i8_3, "cast_u64_i8_3"),       // 597
    (cast_u64_i8_4, "cast_u64_i8_4"),       // 598
    (cast_u64_i8_5, "cast_u64_i8_5"),       // 599
    (cast_u64_u16_1, "cast_u64_u16_1"),     // 600
    (cast_u64_u16_2, "cast_u64_u16_2"),     // 601
    (cast_u64_u16_3, "cast_u64_u16_3"),     // 602
    (cast_u64_u16_4, "cast_u64_u16_4"),     // 603
    (cast_u64_u16_5, "cast_u64_u16_5"),     // 604
    (cast_u64_u32_1, "cast_u64_u32_1"),     // 605
    (cast_u64_u32_2, "cast_u64_u32_2"),     // 606
    (cast_u64_u32_3, "cast_u64_u32_3"),     // 607
    (cast_u64_u32_4, "cast_u64_u32_4"),     // 608
    (cast_u64_u32_5, "cast_u64_u32_5"),     // 609
    (cast_u64_u8_1, "cast_u64_u8_1"),       // 610
    (cast_u64_u8_2, "cast_u64_u8_2"),       // 611
    (cast_u64_u8_3, "cast_u64_u8_3"),       // 612
    (cast_u64_u8_4, "cast_u64_u8_4"),       // 613
    (cast_u64_u8_5, "cast_u64_u8_5"),       // 614
    (cast_u8_bool_1, "cast_u8_bool_1"),     // 615
    (cast_u8_bool_2, "cast_u8_bool_2"),     // 616
    (cast_u8_bool_3, "cast_u8_bool_3"),     // 617
    (cast_u8_bool_4, "cast_u8_bool_4"),     // 618
    (cast_u8_bool_5, "cast_u8_bool_5"),     // 619
    (cast_u8_f32_1, "cast_u8_f32_1"),       // 620
    (cast_u8_f32_2, "cast_u8_f32_2"),       // 621
    (cast_u8_f32_3, "cast_u8_f32_3"),       // 622
    (cast_u8_f32_4, "cast_u8_f32_4"),       // 623
    (cast_u8_f32_5, "cast_u8_f32_5"),       // 624
    (cast_u8_f64_1, "cast_u8_f64_1"),       // 625
    (cast_u8_f64_2, "cast_u8_f64_2"),       // 626
    (cast_u8_f64_3, "cast_u8_f64_3"),       // 627
    (cast_u8_f64_4, "cast_u8_f64_4"),       // 628
    (cast_u8_f64_5, "cast_u8_f64_5"),       // 629
    (cast_u8_i16_1, "cast_u8_i16_1"),       // 630
    (cast_u8_i16_2, "cast_u8_i16_2"),       // 631
    (cast_u8_i16_3, "cast_u8_i16_3"),       // 632
    (cast_u8_i16_4, "cast_u8_i16_4"),       // 633
    (cast_u8_i16_5, "cast_u8_i16_5"),       // 634
    (cast_u8_i32_1, "cast_u8_i32_1"),       // 635
    (cast_u8_i32_2, "cast_u8_i32_2"),       // 636
    (cast_u8_i32_3, "cast_u8_i32_3"),       // 637
    (cast_u8_i32_4, "cast_u8_i32_4"),       // 638
    (cast_u8_i32_5, "cast_u8_i32_5"),       // 639
    (cast_u8_i64_1, "cast_u8_i64_1"),       // 640
    (cast_u8_i64_2, "cast_u8_i64_2"),       // 641
    (cast_u8_i64_3, "cast_u8_i64_3"),       // 642
    (cast_u8_i64_4, "cast_u8_i64_4"),       // 643
    (cast_u8_i64_5, "cast_u8_i64_5"),       // 644
    (cast_u8_i8_1, "cast_u8_i8_1"),         // 645
    (cast_u8_i8_2, "cast_u8_i8_2"),         // 646
    (cast_u8_i8_3, "cast_u8_i8_3"),         // 647
    (cast_u8_i8_4, "cast_u8_i8_4"),         // 648
    (cast_u8_i8_5, "cast_u8_i8_5"),         // 649
    (cast_u8_u16_1, "cast_u8_u16_1"),       // 650
    (cast_u8_u16_2, "cast_u8_u16_2"),       // 651
    (cast_u8_u16_3, "cast_u8_u16_3"),       // 652
    (cast_u8_u16_4, "cast_u8_u16_4"),       // 653
    (cast_u8_u16_5, "cast_u8_u16_5"),       // 654
    (cast_u8_u32_1, "cast_u8_u32_1"),       // 655
    (cast_u8_u32_2, "cast_u8_u32_2"),       // 656
    (cast_u8_u32_3, "cast_u8_u32_3"),       // 657
    (cast_u8_u32_4, "cast_u8_u32_4"),       // 658
    (cast_u8_u32_5, "cast_u8_u32_5"),       // 659
    (cast_u8_u64_1, "cast_u8_u64_1"),       // 660
    (cast_u8_u64_2, "cast_u8_u64_2"),       // 661
    (cast_u8_u64_3, "cast_u8_u64_3"),       // 662
    (cast_u8_u64_4, "cast_u8_u64_4"),       // 663
    (cast_u8_u64_5, "cast_u8_u64_5"),       // 664
    (div_f32_1, "div_f32_1"),               // 665
    (div_f32_2, "div_f32_2"),               // 666
    (div_f32_3, "div_f32_3"),               // 667
    (div_f32_4, "div_f32_4"),               // 668
    (div_f32_5, "div_f32_5"),               // 669
    (div_f64_1, "div_f64_1"),               // 670
    (div_f64_2, "div_f64_2"),               // 671
    (div_f64_3, "div_f64_3"),               // 672
    (div_f64_4, "div_f64_4"),               // 673
    (div_f64_5, "div_f64_5"),               // 674
    (div_i16_1, "div_i16_1"),               // 675
    (div_i16_2, "div_i16_2"),               // 676
    (div_i16_3, "div_i16_3"),               // 677
    (div_i16_4, "div_i16_4"),               // 678
    (div_i16_5, "div_i16_5"),               // 679
    (div_i32_1, "div_i32_1"),               // 680
    (div_i32_2, "div_i32_2"),               // 681
    (div_i32_3, "div_i32_3"),               // 682
    (div_i32_4, "div_i32_4"),               // 683
    (div_i32_5, "div_i32_5"),               // 684
    (div_i64_1, "div_i64_1"),               // 685
    (div_i64_2, "div_i64_2"),               // 686
    (div_i64_3, "div_i64_3"),               // 687
    (div_i64_4, "div_i64_4"),               // 688
    (div_i64_5, "div_i64_5"),               // 689
    (div_i8_1, "div_i8_1"),                 // 690
    (div_i8_2, "div_i8_2"),                 // 691
    (div_i8_3, "div_i8_3"),                 // 692
    (div_i8_4, "div_i8_4"),                 // 693
    (div_i8_5, "div_i8_5"),                 // 694
    (div_u16_1, "div_u16_1"),               // 695
    (div_u16_2, "div_u16_2"),               // 696
    (div_u16_3, "div_u16_3"),               // 697
    (div_u16_4, "div_u16_4"),               // 698
    (div_u16_5, "div_u16_5"),               // 699
    (div_u32_1, "div_u32_1"),               // 700
    (div_u32_2, "div_u32_2"),               // 701
    (div_u32_3, "div_u32_3"),               // 702
    (div_u32_4, "div_u32_4"),               // 703
    (div_u32_5, "div_u32_5"),               // 704
    (div_u64_1, "div_u64_1"),               // 705
    (div_u64_2, "div_u64_2"),               // 706
    (div_u64_3, "div_u64_3"),               // 707
    (div_u64_4, "div_u64_4"),               // 708
    (div_u64_5, "div_u64_5"),               // 709
    (div_u8_1, "div_u8_1"),                 // 710
    (div_u8_2, "div_u8_2"),                 // 711
    (div_u8_3, "div_u8_3"),                 // 712
    (div_u8_4, "div_u8_4"),                 // 713
    (div_u8_5, "div_u8_5"),                 // 714
    (eq_bool_1, "eq_bool_1"),               // 715
    (eq_bool_2, "eq_bool_2"),               // 716
    (eq_bool_3, "eq_bool_3"),               // 717
    (eq_bool_4, "eq_bool_4"),               // 718
    (eq_bool_5, "eq_bool_5"),               // 719
    (eq_f32_1, "eq_f32_1"),                 // 720
    (eq_f32_2, "eq_f32_2"),                 // 721
    (eq_f32_3, "eq_f32_3"),                 // 722
    (eq_f32_4, "eq_f32_4"),                 // 723
    (eq_f32_5, "eq_f32_5"),                 // 724
    (eq_f64_1, "eq_f64_1"),                 // 725
    (eq_f64_2, "eq_f64_2"),                 // 726
    (eq_f64_3, "eq_f64_3"),                 // 727
    (eq_f64_4, "eq_f64_4"),                 // 728
    (eq_f64_5, "eq_f64_5"),                 // 729
    (eq_i16_1, "eq_i16_1"),                 // 730
    (eq_i16_2, "eq_i16_2"),                 // 731
    (eq_i16_3, "eq_i16_3"),                 // 732
    (eq_i16_4, "eq_i16_4"),                 // 733
    (eq_i16_5, "eq_i16_5"),                 // 734
    (eq_i32_1, "eq_i32_1"),                 // 735
    (eq_i32_2, "eq_i32_2"),                 // 736
    (eq_i32_3, "eq_i32_3"),                 // 737
    (eq_i32_4, "eq_i32_4"),                 // 738
    (eq_i32_5, "eq_i32_5"),                 // 739
    (eq_i64_1, "eq_i64_1"),                 // 740
    (eq_i64_2, "eq_i64_2"),                 // 741
    (eq_i64_3, "eq_i64_3"),                 // 742
    (eq_i64_4, "eq_i64_4"),                 // 743
    (eq_i64_5, "eq_i64_5"),                 // 744
    (eq_i8_1, "eq_i8_1"),                   // 745
    (eq_i8_2, "eq_i8_2"),                   // 746
    (eq_i8_3, "eq_i8_3"),                   // 747
    (eq_i8_4, "eq_i8_4"),                   // 748
    (eq_i8_5, "eq_i8_5"),                   // 749
    (eq_u16_1, "eq_u16_1"),                 // 750
    (eq_u16_2, "eq_u16_2"),                 // 751
    (eq_u16_3, "eq_u16_3"),                 // 752
    (eq_u16_4, "eq_u16_4"),                 // 753
    (eq_u16_5, "eq_u16_5"),                 // 754
    (eq_u32_1, "eq_u32_1"),                 // 755
    (eq_u32_2, "eq_u32_2"),                 // 756
    (eq_u32_3, "eq_u32_3"),                 // 757
    (eq_u32_4, "eq_u32_4"),                 // 758
    (eq_u32_5, "eq_u32_5"),                 // 759
    (eq_u64_1, "eq_u64_1"),                 // 760
    (eq_u64_2, "eq_u64_2"),                 // 761
    (eq_u64_3, "eq_u64_3"),                 // 762
    (eq_u64_4, "eq_u64_4"),                 // 763
    (eq_u64_5, "eq_u64_5"),                 // 764
    (eq_u8_1, "eq_u8_1"),                   // 765
    (eq_u8_2, "eq_u8_2"),                   // 766
    (eq_u8_3, "eq_u8_3"),                   // 767
    (eq_u8_4, "eq_u8_4"),                   // 768
    (eq_u8_5, "eq_u8_5"),                   // 769
    (expand_bool_1, "expand_bool_1"),       // 770
    (expand_bool_2, "expand_bool_2"),       // 771
    (expand_bool_3, "expand_bool_3"),       // 772
    (expand_bool_4, "expand_bool_4"),       // 773
    (expand_bool_5, "expand_bool_5"),       // 774
    (expand_f32_1, "expand_f32_1"),         // 775
    (expand_f32_2, "expand_f32_2"),         // 776
    (expand_f32_3, "expand_f32_3"),         // 777
    (expand_f32_4, "expand_f32_4"),         // 778
    (expand_f32_5, "expand_f32_5"),         // 779
    (expand_f64_1, "expand_f64_1"),         // 780
    (expand_f64_2, "expand_f64_2"),         // 781
    (expand_f64_3, "expand_f64_3"),         // 782
    (expand_f64_4, "expand_f64_4"),         // 783
    (expand_f64_5, "expand_f64_5"),         // 784
    (expand_i16_1, "expand_i16_1"),         // 785
    (expand_i16_2, "expand_i16_2"),         // 786
    (expand_i16_3, "expand_i16_3"),         // 787
    (expand_i16_4, "expand_i16_4"),         // 788
    (expand_i16_5, "expand_i16_5"),         // 789
    (expand_i32_1, "expand_i32_1"),         // 790
    (expand_i32_2, "expand_i32_2"),         // 791
    (expand_i32_3, "expand_i32_3"),         // 792
    (expand_i32_4, "expand_i32_4"),         // 793
    (expand_i32_5, "expand_i32_5"),         // 794
    (expand_i64_1, "expand_i64_1"),         // 795
    (expand_i64_2, "expand_i64_2"),         // 796
    (expand_i64_3, "expand_i64_3"),         // 797
    (expand_i64_4, "expand_i64_4"),         // 798
    (expand_i64_5, "expand_i64_5"),         // 799
    (expand_i8_1, "expand_i8_1"),           // 800
    (expand_i8_2, "expand_i8_2"),           // 801
    (expand_i8_3, "expand_i8_3"),           // 802
    (expand_i8_4, "expand_i8_4"),           // 803
    (expand_i8_5, "expand_i8_5"),           // 804
    (expand_u16_1, "expand_u16_1"),         // 805
    (expand_u16_2, "expand_u16_2"),         // 806
    (expand_u16_3, "expand_u16_3"),         // 807
    (expand_u16_4, "expand_u16_4"),         // 808
    (expand_u16_5, "expand_u16_5"),         // 809
    (expand_u32_1, "expand_u32_1"),         // 810
    (expand_u32_2, "expand_u32_2"),         // 811
    (expand_u32_3, "expand_u32_3"),         // 812
    (expand_u32_4, "expand_u32_4"),         // 813
    (expand_u32_5, "expand_u32_5"),         // 814
    (expand_u64_1, "expand_u64_1"),         // 815
    (expand_u64_2, "expand_u64_2"),         // 816
    (expand_u64_3, "expand_u64_3"),         // 817
    (expand_u64_4, "expand_u64_4"),         // 818
    (expand_u64_5, "expand_u64_5"),         // 819
    (expand_u8_1, "expand_u8_1"),           // 820
    (expand_u8_2, "expand_u8_2"),           // 821
    (expand_u8_3, "expand_u8_3"),           // 822
    (expand_u8_4, "expand_u8_4"),           // 823
    (expand_u8_5, "expand_u8_5"),           // 824
    (fill_bool_1, "fill_bool_1"),           // 825
    (fill_bool_2, "fill_bool_2"),           // 826
    (fill_bool_3, "fill_bool_3"),           // 827
    (fill_bool_4, "fill_bool_4"),           // 828
    (fill_bool_5, "fill_bool_5"),           // 829
    (fill_f32_1, "fill_f32_1"),             // 830
    (fill_f32_2, "fill_f32_2"),             // 831
    (fill_f32_3, "fill_f32_3"),             // 832
    (fill_f32_4, "fill_f32_4"),             // 833
    (fill_f32_5, "fill_f32_5"),             // 834
    (fill_f64_1, "fill_f64_1"),             // 835
    (fill_f64_2, "fill_f64_2"),             // 836
    (fill_f64_3, "fill_f64_3"),             // 837
    (fill_f64_4, "fill_f64_4"),             // 838
    (fill_f64_5, "fill_f64_5"),             // 839
    (fill_i16_1, "fill_i16_1"),             // 840
    (fill_i16_2, "fill_i16_2"),             // 841
    (fill_i16_3, "fill_i16_3"),             // 842
    (fill_i16_4, "fill_i16_4"),             // 843
    (fill_i16_5, "fill_i16_5"),             // 844
    (fill_i32_1, "fill_i32_1"),             // 845
    (fill_i32_2, "fill_i32_2"),             // 846
    (fill_i32_3, "fill_i32_3"),             // 847
    (fill_i32_4, "fill_i32_4"),             // 848
    (fill_i32_5, "fill_i32_5"),             // 849
    (fill_i64_1, "fill_i64_1"),             // 850
    (fill_i64_2, "fill_i64_2"),             // 851
    (fill_i64_3, "fill_i64_3"),             // 852
    (fill_i64_4, "fill_i64_4"),             // 853
    (fill_i64_5, "fill_i64_5"),             // 854
    (fill_i8_1, "fill_i8_1"),               // 855
    (fill_i8_2, "fill_i8_2"),               // 856
    (fill_i8_3, "fill_i8_3"),               // 857
    (fill_i8_4, "fill_i8_4"),               // 858
    (fill_i8_5, "fill_i8_5"),               // 859
    (fill_u16_1, "fill_u16_1"),             // 860
    (fill_u16_2, "fill_u16_2"),             // 861
    (fill_u16_3, "fill_u16_3"),             // 862
    (fill_u16_4, "fill_u16_4"),             // 863
    (fill_u16_5, "fill_u16_5"),             // 864
    (fill_u32_1, "fill_u32_1"),             // 865
    (fill_u32_2, "fill_u32_2"),             // 866
    (fill_u32_3, "fill_u32_3"),             // 867
    (fill_u32_4, "fill_u32_4"),             // 868
    (fill_u32_5, "fill_u32_5"),             // 869
    (fill_u64_1, "fill_u64_1"),             // 870
    (fill_u64_2, "fill_u64_2"),             // 871
    (fill_u64_3, "fill_u64_3"),             // 872
    (fill_u64_4, "fill_u64_4"),             // 873
    (fill_u64_5, "fill_u64_5"),             // 874
    (fill_u8_1, "fill_u8_1"),               // 875
    (fill_u8_2, "fill_u8_2"),               // 876
    (fill_u8_3, "fill_u8_3"),               // 877
    (fill_u8_4, "fill_u8_4"),               // 878
    (fill_u8_5, "fill_u8_5"),               // 879
    (flip_bool_1, "flip_bool_1"),           // 880
    (flip_bool_2, "flip_bool_2"),           // 881
    (flip_bool_3, "flip_bool_3"),           // 882
    (flip_bool_4, "flip_bool_4"),           // 883
    (flip_bool_5, "flip_bool_5"),           // 884
    (flip_f32_1, "flip_f32_1"),             // 885
    (flip_f32_2, "flip_f32_2"),             // 886
    (flip_f32_3, "flip_f32_3"),             // 887
    (flip_f32_4, "flip_f32_4"),             // 888
    (flip_f32_5, "flip_f32_5"),             // 889
    (flip_f64_1, "flip_f64_1"),             // 890
    (flip_f64_2, "flip_f64_2"),             // 891
    (flip_f64_3, "flip_f64_3"),             // 892
    (flip_f64_4, "flip_f64_4"),             // 893
    (flip_f64_5, "flip_f64_5"),             // 894
    (flip_i16_1, "flip_i16_1"),             // 895
    (flip_i16_2, "flip_i16_2"),             // 896
    (flip_i16_3, "flip_i16_3"),             // 897
    (flip_i16_4, "flip_i16_4"),             // 898
    (flip_i16_5, "flip_i16_5"),             // 899
    (flip_i32_1, "flip_i32_1"),             // 900
    (flip_i32_2, "flip_i32_2"),             // 901
    (flip_i32_3, "flip_i32_3"),             // 902
    (flip_i32_4, "flip_i32_4"),             // 903
    (flip_i32_5, "flip_i32_5"),             // 904
    (flip_i64_1, "flip_i64_1"),             // 905
    (flip_i64_2, "flip_i64_2"),             // 906
    (flip_i64_3, "flip_i64_3"),             // 907
    (flip_i64_4, "flip_i64_4"),             // 908
    (flip_i64_5, "flip_i64_5"),             // 909
    (flip_i8_1, "flip_i8_1"),               // 910
    (flip_i8_2, "flip_i8_2"),               // 911
    (flip_i8_3, "flip_i8_3"),               // 912
    (flip_i8_4, "flip_i8_4"),               // 913
    (flip_i8_5, "flip_i8_5"),               // 914
    (flip_u16_1, "flip_u16_1"),             // 915
    (flip_u16_2, "flip_u16_2"),             // 916
    (flip_u16_3, "flip_u16_3"),             // 917
    (flip_u16_4, "flip_u16_4"),             // 918
    (flip_u16_5, "flip_u16_5"),             // 919
    (flip_u32_1, "flip_u32_1"),             // 920
    (flip_u32_2, "flip_u32_2"),             // 921
    (flip_u32_3, "flip_u32_3"),             // 922
    (flip_u32_4, "flip_u32_4"),             // 923
    (flip_u32_5, "flip_u32_5"),             // 924
    (flip_u64_1, "flip_u64_1"),             // 925
    (flip_u64_2, "flip_u64_2"),             // 926
    (flip_u64_3, "flip_u64_3"),             // 927
    (flip_u64_4, "flip_u64_4"),             // 928
    (flip_u64_5, "flip_u64_5"),             // 929
    (flip_u8_1, "flip_u8_1"),               // 930
    (flip_u8_2, "flip_u8_2"),               // 931
    (flip_u8_3, "flip_u8_3"),               // 932
    (flip_u8_4, "flip_u8_4"),               // 933
    (flip_u8_5, "flip_u8_5"),               // 934
    (ge_bool_1, "ge_bool_1"),               // 935
    (ge_bool_2, "ge_bool_2"),               // 936
    (ge_bool_3, "ge_bool_3"),               // 937
    (ge_bool_4, "ge_bool_4"),               // 938
    (ge_bool_5, "ge_bool_5"),               // 939
    (ge_f32_1, "ge_f32_1"),                 // 940
    (ge_f32_2, "ge_f32_2"),                 // 941
    (ge_f32_3, "ge_f32_3"),                 // 942
    (ge_f32_4, "ge_f32_4"),                 // 943
    (ge_f32_5, "ge_f32_5"),                 // 944
    (ge_f64_1, "ge_f64_1"),                 // 945
    (ge_f64_2, "ge_f64_2"),                 // 946
    (ge_f64_3, "ge_f64_3"),                 // 947
    (ge_f64_4, "ge_f64_4"),                 // 948
    (ge_f64_5, "ge_f64_5"),                 // 949
    (ge_i16_1, "ge_i16_1"),                 // 950
    (ge_i16_2, "ge_i16_2"),                 // 951
    (ge_i16_3, "ge_i16_3"),                 // 952
    (ge_i16_4, "ge_i16_4"),                 // 953
    (ge_i16_5, "ge_i16_5"),                 // 954
    (ge_i32_1, "ge_i32_1"),                 // 955
    (ge_i32_2, "ge_i32_2"),                 // 956
    (ge_i32_3, "ge_i32_3"),                 // 957
    (ge_i32_4, "ge_i32_4"),                 // 958
    (ge_i32_5, "ge_i32_5"),                 // 959
    (ge_i64_1, "ge_i64_1"),                 // 960
    (ge_i64_2, "ge_i64_2"),                 // 961
    (ge_i64_3, "ge_i64_3"),                 // 962
    (ge_i64_4, "ge_i64_4"),                 // 963
    (ge_i64_5, "ge_i64_5"),                 // 964
    (ge_i8_1, "ge_i8_1"),                   // 965
    (ge_i8_2, "ge_i8_2"),                   // 966
    (ge_i8_3, "ge_i8_3"),                   // 967
    (ge_i8_4, "ge_i8_4"),                   // 968
    (ge_i8_5, "ge_i8_5"),                   // 969
    (ge_u16_1, "ge_u16_1"),                 // 970
    (ge_u16_2, "ge_u16_2"),                 // 971
    (ge_u16_3, "ge_u16_3"),                 // 972
    (ge_u16_4, "ge_u16_4"),                 // 973
    (ge_u16_5, "ge_u16_5"),                 // 974
    (ge_u32_1, "ge_u32_1"),                 // 975
    (ge_u32_2, "ge_u32_2"),                 // 976
    (ge_u32_3, "ge_u32_3"),                 // 977
    (ge_u32_4, "ge_u32_4"),                 // 978
    (ge_u32_5, "ge_u32_5"),                 // 979
    (ge_u64_1, "ge_u64_1"),                 // 980
    (ge_u64_2, "ge_u64_2"),                 // 981
    (ge_u64_3, "ge_u64_3"),                 // 982
    (ge_u64_4, "ge_u64_4"),                 // 983
    (ge_u64_5, "ge_u64_5"),                 // 984
    (ge_u8_1, "ge_u8_1"),                   // 985
    (ge_u8_2, "ge_u8_2"),                   // 986
    (ge_u8_3, "ge_u8_3"),                   // 987
    (ge_u8_4, "ge_u8_4"),                   // 988
    (ge_u8_5, "ge_u8_5"),                   // 989
    (gt_bool_1, "gt_bool_1"),               // 990
    (gt_bool_2, "gt_bool_2"),               // 991
    (gt_bool_3, "gt_bool_3"),               // 992
    (gt_bool_4, "gt_bool_4"),               // 993
    (gt_bool_5, "gt_bool_5"),               // 994
    (gt_f32_1, "gt_f32_1"),                 // 995
    (gt_f32_2, "gt_f32_2"),                 // 996
    (gt_f32_3, "gt_f32_3"),                 // 997
    (gt_f32_4, "gt_f32_4"),                 // 998
    (gt_f32_5, "gt_f32_5"),                 // 999
    (gt_f64_1, "gt_f64_1"),                 // 1000
    (gt_f64_2, "gt_f64_2"),                 // 1001
    (gt_f64_3, "gt_f64_3"),                 // 1002
    (gt_f64_4, "gt_f64_4"),                 // 1003
    (gt_f64_5, "gt_f64_5"),                 // 1004
    (gt_i16_1, "gt_i16_1"),                 // 1005
    (gt_i16_2, "gt_i16_2"),                 // 1006
    (gt_i16_3, "gt_i16_3"),                 // 1007
    (gt_i16_4, "gt_i16_4"),                 // 1008
    (gt_i16_5, "gt_i16_5"),                 // 1009
    (gt_i32_1, "gt_i32_1"),                 // 1010
    (gt_i32_2, "gt_i32_2"),                 // 1011
    (gt_i32_3, "gt_i32_3"),                 // 1012
    (gt_i32_4, "gt_i32_4"),                 // 1013
    (gt_i32_5, "gt_i32_5"),                 // 1014
    (gt_i64_1, "gt_i64_1"),                 // 1015
    (gt_i64_2, "gt_i64_2"),                 // 1016
    (gt_i64_3, "gt_i64_3"),                 // 1017
    (gt_i64_4, "gt_i64_4"),                 // 1018
    (gt_i64_5, "gt_i64_5"),                 // 1019
    (gt_i8_1, "gt_i8_1"),                   // 1020
    (gt_i8_2, "gt_i8_2"),                   // 1021
    (gt_i8_3, "gt_i8_3"),                   // 1022
    (gt_i8_4, "gt_i8_4"),                   // 1023
    (gt_i8_5, "gt_i8_5"),                   // 1024
    (gt_u16_1, "gt_u16_1"),                 // 1025
    (gt_u16_2, "gt_u16_2"),                 // 1026
    (gt_u16_3, "gt_u16_3"),                 // 1027
    (gt_u16_4, "gt_u16_4"),                 // 1028
    (gt_u16_5, "gt_u16_5"),                 // 1029
    (gt_u32_1, "gt_u32_1"),                 // 1030
    (gt_u32_2, "gt_u32_2"),                 // 1031
    (gt_u32_3, "gt_u32_3"),                 // 1032
    (gt_u32_4, "gt_u32_4"),                 // 1033
    (gt_u32_5, "gt_u32_5"),                 // 1034
    (gt_u64_1, "gt_u64_1"),                 // 1035
    (gt_u64_2, "gt_u64_2"),                 // 1036
    (gt_u64_3, "gt_u64_3"),                 // 1037
    (gt_u64_4, "gt_u64_4"),                 // 1038
    (gt_u64_5, "gt_u64_5"),                 // 1039
    (gt_u8_1, "gt_u8_1"),                   // 1040
    (gt_u8_2, "gt_u8_2"),                   // 1041
    (gt_u8_3, "gt_u8_3"),                   // 1042
    (gt_u8_4, "gt_u8_4"),                   // 1043
    (gt_u8_5, "gt_u8_5"),                   // 1044
    (le_bool_1, "le_bool_1"),               // 1045
    (le_bool_2, "le_bool_2"),               // 1046
    (le_bool_3, "le_bool_3"),               // 1047
    (le_bool_4, "le_bool_4"),               // 1048
    (le_bool_5, "le_bool_5"),               // 1049
    (le_f32_1, "le_f32_1"),                 // 1050
    (le_f32_2, "le_f32_2"),                 // 1051
    (le_f32_3, "le_f32_3"),                 // 1052
    (le_f32_4, "le_f32_4"),                 // 1053
    (le_f32_5, "le_f32_5"),                 // 1054
    (le_f64_1, "le_f64_1"),                 // 1055
    (le_f64_2, "le_f64_2"),                 // 1056
    (le_f64_3, "le_f64_3"),                 // 1057
    (le_f64_4, "le_f64_4"),                 // 1058
    (le_f64_5, "le_f64_5"),                 // 1059
    (le_i16_1, "le_i16_1"),                 // 1060
    (le_i16_2, "le_i16_2"),                 // 1061
    (le_i16_3, "le_i16_3"),                 // 1062
    (le_i16_4, "le_i16_4"),                 // 1063
    (le_i16_5, "le_i16_5"),                 // 1064
    (le_i32_1, "le_i32_1"),                 // 1065
    (le_i32_2, "le_i32_2"),                 // 1066
    (le_i32_3, "le_i32_3"),                 // 1067
    (le_i32_4, "le_i32_4"),                 // 1068
    (le_i32_5, "le_i32_5"),                 // 1069
    (le_i64_1, "le_i64_1"),                 // 1070
    (le_i64_2, "le_i64_2"),                 // 1071
    (le_i64_3, "le_i64_3"),                 // 1072
    (le_i64_4, "le_i64_4"),                 // 1073
    (le_i64_5, "le_i64_5"),                 // 1074
    (le_i8_1, "le_i8_1"),                   // 1075
    (le_i8_2, "le_i8_2"),                   // 1076
    (le_i8_3, "le_i8_3"),                   // 1077
    (le_i8_4, "le_i8_4"),                   // 1078
    (le_i8_5, "le_i8_5"),                   // 1079
    (le_u16_1, "le_u16_1"),                 // 1080
    (le_u16_2, "le_u16_2"),                 // 1081
    (le_u16_3, "le_u16_3"),                 // 1082
    (le_u16_4, "le_u16_4"),                 // 1083
    (le_u16_5, "le_u16_5"),                 // 1084
    (le_u32_1, "le_u32_1"),                 // 1085
    (le_u32_2, "le_u32_2"),                 // 1086
    (le_u32_3, "le_u32_3"),                 // 1087
    (le_u32_4, "le_u32_4"),                 // 1088
    (le_u32_5, "le_u32_5"),                 // 1089
    (le_u64_1, "le_u64_1"),                 // 1090
    (le_u64_2, "le_u64_2"),                 // 1091
    (le_u64_3, "le_u64_3"),                 // 1092
    (le_u64_4, "le_u64_4"),                 // 1093
    (le_u64_5, "le_u64_5"),                 // 1094
    (le_u8_1, "le_u8_1"),                   // 1095
    (le_u8_2, "le_u8_2"),                   // 1096
    (le_u8_3, "le_u8_3"),                   // 1097
    (le_u8_4, "le_u8_4"),                   // 1098
    (le_u8_5, "le_u8_5"),                   // 1099
    (lt_bool_1, "lt_bool_1"),               // 1100
    (lt_bool_2, "lt_bool_2"),               // 1101
    (lt_bool_3, "lt_bool_3"),               // 1102
    (lt_bool_4, "lt_bool_4"),               // 1103
    (lt_bool_5, "lt_bool_5"),               // 1104
    (lt_f32_1, "lt_f32_1"),                 // 1105
    (lt_f32_2, "lt_f32_2"),                 // 1106
    (lt_f32_3, "lt_f32_3"),                 // 1107
    (lt_f32_4, "lt_f32_4"),                 // 1108
    (lt_f32_5, "lt_f32_5"),                 // 1109
    (lt_f64_1, "lt_f64_1"),                 // 1110
    (lt_f64_2, "lt_f64_2"),                 // 1111
    (lt_f64_3, "lt_f64_3"),                 // 1112
    (lt_f64_4, "lt_f64_4"),                 // 1113
    (lt_f64_5, "lt_f64_5"),                 // 1114
    (lt_i16_1, "lt_i16_1"),                 // 1115
    (lt_i16_2, "lt_i16_2"),                 // 1116
    (lt_i16_3, "lt_i16_3"),                 // 1117
    (lt_i16_4, "lt_i16_4"),                 // 1118
    (lt_i16_5, "lt_i16_5"),                 // 1119
    (lt_i32_1, "lt_i32_1"),                 // 1120
    (lt_i32_2, "lt_i32_2"),                 // 1121
    (lt_i32_3, "lt_i32_3"),                 // 1122
    (lt_i32_4, "lt_i32_4"),                 // 1123
    (lt_i32_5, "lt_i32_5"),                 // 1124
    (lt_i64_1, "lt_i64_1"),                 // 1125
    (lt_i64_2, "lt_i64_2"),                 // 1126
    (lt_i64_3, "lt_i64_3"),                 // 1127
    (lt_i64_4, "lt_i64_4"),                 // 1128
    (lt_i64_5, "lt_i64_5"),                 // 1129
    (lt_i8_1, "lt_i8_1"),                   // 1130
    (lt_i8_2, "lt_i8_2"),                   // 1131
    (lt_i8_3, "lt_i8_3"),                   // 1132
    (lt_i8_4, "lt_i8_4"),                   // 1133
    (lt_i8_5, "lt_i8_5"),                   // 1134
    (lt_u16_1, "lt_u16_1"),                 // 1135
    (lt_u16_2, "lt_u16_2"),                 // 1136
    (lt_u16_3, "lt_u16_3"),                 // 1137
    (lt_u16_4, "lt_u16_4"),                 // 1138
    (lt_u16_5, "lt_u16_5"),                 // 1139
    (lt_u32_1, "lt_u32_1"),                 // 1140
    (lt_u32_2, "lt_u32_2"),                 // 1141
    (lt_u32_3, "lt_u32_3"),                 // 1142
    (lt_u32_4, "lt_u32_4"),                 // 1143
    (lt_u32_5, "lt_u32_5"),                 // 1144
    (lt_u64_1, "lt_u64_1"),                 // 1145
    (lt_u64_2, "lt_u64_2"),                 // 1146
    (lt_u64_3, "lt_u64_3"),                 // 1147
    (lt_u64_4, "lt_u64_4"),                 // 1148
    (lt_u64_5, "lt_u64_5"),                 // 1149
    (lt_u8_1, "lt_u8_1"),                   // 1150
    (lt_u8_2, "lt_u8_2"),                   // 1151
    (lt_u8_3, "lt_u8_3"),                   // 1152
    (lt_u8_4, "lt_u8_4"),                   // 1153
    (lt_u8_5, "lt_u8_5"),                   // 1154
    (max_f32_1, "max_f32_1"),               // 1155
    (max_f32_2, "max_f32_2"),               // 1156
    (max_f32_3, "max_f32_3"),               // 1157
    (max_f32_4, "max_f32_4"),               // 1158
    (max_f32_5, "max_f32_5"),               // 1159
    (max_f64_1, "max_f64_1"),               // 1160
    (max_f64_2, "max_f64_2"),               // 1161
    (max_f64_3, "max_f64_3"),               // 1162
    (max_f64_4, "max_f64_4"),               // 1163
    (max_f64_5, "max_f64_5"),               // 1164
    (max_i16_1, "max_i16_1"),               // 1165
    (max_i16_2, "max_i16_2"),               // 1166
    (max_i16_3, "max_i16_3"),               // 1167
    (max_i16_4, "max_i16_4"),               // 1168
    (max_i16_5, "max_i16_5"),               // 1169
    (max_i32_1, "max_i32_1"),               // 1170
    (max_i32_2, "max_i32_2"),               // 1171
    (max_i32_3, "max_i32_3"),               // 1172
    (max_i32_4, "max_i32_4"),               // 1173
    (max_i32_5, "max_i32_5"),               // 1174
    (max_i64_1, "max_i64_1"),               // 1175
    (max_i64_2, "max_i64_2"),               // 1176
    (max_i64_3, "max_i64_3"),               // 1177
    (max_i64_4, "max_i64_4"),               // 1178
    (max_i64_5, "max_i64_5"),               // 1179
    (max_i8_1, "max_i8_1"),                 // 1180
    (max_i8_2, "max_i8_2"),                 // 1181
    (max_i8_3, "max_i8_3"),                 // 1182
    (max_i8_4, "max_i8_4"),                 // 1183
    (max_i8_5, "max_i8_5"),                 // 1184
    (max_u16_1, "max_u16_1"),               // 1185
    (max_u16_2, "max_u16_2"),               // 1186
    (max_u16_3, "max_u16_3"),               // 1187
    (max_u16_4, "max_u16_4"),               // 1188
    (max_u16_5, "max_u16_5"),               // 1189
    (max_u32_1, "max_u32_1"),               // 1190
    (max_u32_2, "max_u32_2"),               // 1191
    (max_u32_3, "max_u32_3"),               // 1192
    (max_u32_4, "max_u32_4"),               // 1193
    (max_u32_5, "max_u32_5"),               // 1194
    (max_u64_1, "max_u64_1"),               // 1195
    (max_u64_2, "max_u64_2"),               // 1196
    (max_u64_3, "max_u64_3"),               // 1197
    (max_u64_4, "max_u64_4"),               // 1198
    (max_u64_5, "max_u64_5"),               // 1199
    (max_u8_1, "max_u8_1"),                 // 1200
    (max_u8_2, "max_u8_2"),                 // 1201
    (max_u8_3, "max_u8_3"),                 // 1202
    (max_u8_4, "max_u8_4"),                 // 1203
    (max_u8_5, "max_u8_5"),                 // 1204
    (merge_bool_1, "merge_bool_1"),         // 1205
    (merge_bool_2, "merge_bool_2"),         // 1206
    (merge_bool_3, "merge_bool_3"),         // 1207
    (merge_bool_4, "merge_bool_4"),         // 1208
    (merge_bool_5, "merge_bool_5"),         // 1209
    (merge_f32_1, "merge_f32_1"),           // 1210
    (merge_f32_2, "merge_f32_2"),           // 1211
    (merge_f32_3, "merge_f32_3"),           // 1212
    (merge_f32_4, "merge_f32_4"),           // 1213
    (merge_f32_5, "merge_f32_5"),           // 1214
    (merge_f64_1, "merge_f64_1"),           // 1215
    (merge_f64_2, "merge_f64_2"),           // 1216
    (merge_f64_3, "merge_f64_3"),           // 1217
    (merge_f64_4, "merge_f64_4"),           // 1218
    (merge_f64_5, "merge_f64_5"),           // 1219
    (merge_i16_1, "merge_i16_1"),           // 1220
    (merge_i16_2, "merge_i16_2"),           // 1221
    (merge_i16_3, "merge_i16_3"),           // 1222
    (merge_i16_4, "merge_i16_4"),           // 1223
    (merge_i16_5, "merge_i16_5"),           // 1224
    (merge_i32_1, "merge_i32_1"),           // 1225
    (merge_i32_2, "merge_i32_2"),           // 1226
    (merge_i32_3, "merge_i32_3"),           // 1227
    (merge_i32_4, "merge_i32_4"),           // 1228
    (merge_i32_5, "merge_i32_5"),           // 1229
    (merge_i64_1, "merge_i64_1"),           // 1230
    (merge_i64_2, "merge_i64_2"),           // 1231
    (merge_i64_3, "merge_i64_3"),           // 1232
    (merge_i64_4, "merge_i64_4"),           // 1233
    (merge_i64_5, "merge_i64_5"),           // 1234
    (merge_i8_1, "merge_i8_1"),             // 1235
    (merge_i8_2, "merge_i8_2"),             // 1236
    (merge_i8_3, "merge_i8_3"),             // 1237
    (merge_i8_4, "merge_i8_4"),             // 1238
    (merge_i8_5, "merge_i8_5"),             // 1239
    (merge_u16_1, "merge_u16_1"),           // 1240
    (merge_u16_2, "merge_u16_2"),           // 1241
    (merge_u16_3, "merge_u16_3"),           // 1242
    (merge_u16_4, "merge_u16_4"),           // 1243
    (merge_u16_5, "merge_u16_5"),           // 1244
    (merge_u32_1, "merge_u32_1"),           // 1245
    (merge_u32_2, "merge_u32_2"),           // 1246
    (merge_u32_3, "merge_u32_3"),           // 1247
    (merge_u32_4, "merge_u32_4"),           // 1248
    (merge_u32_5, "merge_u32_5"),           // 1249
    (merge_u64_1, "merge_u64_1"),           // 1250
    (merge_u64_2, "merge_u64_2"),           // 1251
    (merge_u64_3, "merge_u64_3"),           // 1252
    (merge_u64_4, "merge_u64_4"),           // 1253
    (merge_u64_5, "merge_u64_5"),           // 1254
    (merge_u8_1, "merge_u8_1"),             // 1255
    (merge_u8_2, "merge_u8_2"),             // 1256
    (merge_u8_3, "merge_u8_3"),             // 1257
    (merge_u8_4, "merge_u8_4"),             // 1258
    (merge_u8_5, "merge_u8_5"),             // 1259
    (min_f32_1, "min_f32_1"),               // 1260
    (min_f32_2, "min_f32_2"),               // 1261
    (min_f32_3, "min_f32_3"),               // 1262
    (min_f32_4, "min_f32_4"),               // 1263
    (min_f32_5, "min_f32_5"),               // 1264
    (min_f64_1, "min_f64_1"),               // 1265
    (min_f64_2, "min_f64_2"),               // 1266
    (min_f64_3, "min_f64_3"),               // 1267
    (min_f64_4, "min_f64_4"),               // 1268
    (min_f64_5, "min_f64_5"),               // 1269
    (min_i16_1, "min_i16_1"),               // 1270
    (min_i16_2, "min_i16_2"),               // 1271
    (min_i16_3, "min_i16_3"),               // 1272
    (min_i16_4, "min_i16_4"),               // 1273
    (min_i16_5, "min_i16_5"),               // 1274
    (min_i32_1, "min_i32_1"),               // 1275
    (min_i32_2, "min_i32_2"),               // 1276
    (min_i32_3, "min_i32_3"),               // 1277
    (min_i32_4, "min_i32_4"),               // 1278
    (min_i32_5, "min_i32_5"),               // 1279
    (min_i64_1, "min_i64_1"),               // 1280
    (min_i64_2, "min_i64_2"),               // 1281
    (min_i64_3, "min_i64_3"),               // 1282
    (min_i64_4, "min_i64_4"),               // 1283
    (min_i64_5, "min_i64_5"),               // 1284
    (min_i8_1, "min_i8_1"),                 // 1285
    (min_i8_2, "min_i8_2"),                 // 1286
    (min_i8_3, "min_i8_3"),                 // 1287
    (min_i8_4, "min_i8_4"),                 // 1288
    (min_i8_5, "min_i8_5"),                 // 1289
    (min_u16_1, "min_u16_1"),               // 1290
    (min_u16_2, "min_u16_2"),               // 1291
    (min_u16_3, "min_u16_3"),               // 1292
    (min_u16_4, "min_u16_4"),               // 1293
    (min_u16_5, "min_u16_5"),               // 1294
    (min_u32_1, "min_u32_1"),               // 1295
    (min_u32_2, "min_u32_2"),               // 1296
    (min_u32_3, "min_u32_3"),               // 1297
    (min_u32_4, "min_u32_4"),               // 1298
    (min_u32_5, "min_u32_5"),               // 1299
    (min_u64_1, "min_u64_1"),               // 1300
    (min_u64_2, "min_u64_2"),               // 1301
    (min_u64_3, "min_u64_3"),               // 1302
    (min_u64_4, "min_u64_4"),               // 1303
    (min_u64_5, "min_u64_5"),               // 1304
    (min_u8_1, "min_u8_1"),                 // 1305
    (min_u8_2, "min_u8_2"),                 // 1306
    (min_u8_3, "min_u8_3"),                 // 1307
    (min_u8_4, "min_u8_4"),                 // 1308
    (min_u8_5, "min_u8_5"),                 // 1309
    (mul_f32_1, "mul_f32_1"),               // 1310
    (mul_f32_2, "mul_f32_2"),               // 1311
    (mul_f32_3, "mul_f32_3"),               // 1312
    (mul_f32_4, "mul_f32_4"),               // 1313
    (mul_f32_5, "mul_f32_5"),               // 1314
    (mul_f64_1, "mul_f64_1"),               // 1315
    (mul_f64_2, "mul_f64_2"),               // 1316
    (mul_f64_3, "mul_f64_3"),               // 1317
    (mul_f64_4, "mul_f64_4"),               // 1318
    (mul_f64_5, "mul_f64_5"),               // 1319
    (mul_i16_1, "mul_i16_1"),               // 1320
    (mul_i16_2, "mul_i16_2"),               // 1321
    (mul_i16_3, "mul_i16_3"),               // 1322
    (mul_i16_4, "mul_i16_4"),               // 1323
    (mul_i16_5, "mul_i16_5"),               // 1324
    (mul_i32_1, "mul_i32_1"),               // 1325
    (mul_i32_2, "mul_i32_2"),               // 1326
    (mul_i32_3, "mul_i32_3"),               // 1327
    (mul_i32_4, "mul_i32_4"),               // 1328
    (mul_i32_5, "mul_i32_5"),               // 1329
    (mul_i64_1, "mul_i64_1"),               // 1330
    (mul_i64_2, "mul_i64_2"),               // 1331
    (mul_i64_3, "mul_i64_3"),               // 1332
    (mul_i64_4, "mul_i64_4"),               // 1333
    (mul_i64_5, "mul_i64_5"),               // 1334
    (mul_i8_1, "mul_i8_1"),                 // 1335
    (mul_i8_2, "mul_i8_2"),                 // 1336
    (mul_i8_3, "mul_i8_3"),                 // 1337
    (mul_i8_4, "mul_i8_4"),                 // 1338
    (mul_i8_5, "mul_i8_5"),                 // 1339
    (mul_u16_1, "mul_u16_1"),               // 1340
    (mul_u16_2, "mul_u16_2"),               // 1341
    (mul_u16_3, "mul_u16_3"),               // 1342
    (mul_u16_4, "mul_u16_4"),               // 1343
    (mul_u16_5, "mul_u16_5"),               // 1344
    (mul_u32_1, "mul_u32_1"),               // 1345
    (mul_u32_2, "mul_u32_2"),               // 1346
    (mul_u32_3, "mul_u32_3"),               // 1347
    (mul_u32_4, "mul_u32_4"),               // 1348
    (mul_u32_5, "mul_u32_5"),               // 1349
    (mul_u64_1, "mul_u64_1"),               // 1350
    (mul_u64_2, "mul_u64_2"),               // 1351
    (mul_u64_3, "mul_u64_3"),               // 1352
    (mul_u64_4, "mul_u64_4"),               // 1353
    (mul_u64_5, "mul_u64_5"),               // 1354
    (mul_u8_1, "mul_u8_1"),                 // 1355
    (mul_u8_2, "mul_u8_2"),                 // 1356
    (mul_u8_3, "mul_u8_3"),                 // 1357
    (mul_u8_4, "mul_u8_4"),                 // 1358
    (mul_u8_5, "mul_u8_5"),                 // 1359
    (ne_bool_1, "ne_bool_1"),               // 1360
    (ne_bool_2, "ne_bool_2"),               // 1361
    (ne_bool_3, "ne_bool_3"),               // 1362
    (ne_bool_4, "ne_bool_4"),               // 1363
    (ne_bool_5, "ne_bool_5"),               // 1364
    (ne_f32_1, "ne_f32_1"),                 // 1365
    (ne_f32_2, "ne_f32_2"),                 // 1366
    (ne_f32_3, "ne_f32_3"),                 // 1367
    (ne_f32_4, "ne_f32_4"),                 // 1368
    (ne_f32_5, "ne_f32_5"),                 // 1369
    (ne_f64_1, "ne_f64_1"),                 // 1370
    (ne_f64_2, "ne_f64_2"),                 // 1371
    (ne_f64_3, "ne_f64_3"),                 // 1372
    (ne_f64_4, "ne_f64_4"),                 // 1373
    (ne_f64_5, "ne_f64_5"),                 // 1374
    (ne_i16_1, "ne_i16_1"),                 // 1375
    (ne_i16_2, "ne_i16_2"),                 // 1376
    (ne_i16_3, "ne_i16_3"),                 // 1377
    (ne_i16_4, "ne_i16_4"),                 // 1378
    (ne_i16_5, "ne_i16_5"),                 // 1379
    (ne_i32_1, "ne_i32_1"),                 // 1380
    (ne_i32_2, "ne_i32_2"),                 // 1381
    (ne_i32_3, "ne_i32_3"),                 // 1382
    (ne_i32_4, "ne_i32_4"),                 // 1383
    (ne_i32_5, "ne_i32_5"),                 // 1384
    (ne_i64_1, "ne_i64_1"),                 // 1385
    (ne_i64_2, "ne_i64_2"),                 // 1386
    (ne_i64_3, "ne_i64_3"),                 // 1387
    (ne_i64_4, "ne_i64_4"),                 // 1388
    (ne_i64_5, "ne_i64_5"),                 // 1389
    (ne_i8_1, "ne_i8_1"),                   // 1390
    (ne_i8_2, "ne_i8_2"),                   // 1391
    (ne_i8_3, "ne_i8_3"),                   // 1392
    (ne_i8_4, "ne_i8_4"),                   // 1393
    (ne_i8_5, "ne_i8_5"),                   // 1394
    (ne_u16_1, "ne_u16_1"),                 // 1395
    (ne_u16_2, "ne_u16_2"),                 // 1396
    (ne_u16_3, "ne_u16_3"),                 // 1397
    (ne_u16_4, "ne_u16_4"),                 // 1398
    (ne_u16_5, "ne_u16_5"),                 // 1399
    (ne_u32_1, "ne_u32_1"),                 // 1400
    (ne_u32_2, "ne_u32_2"),                 // 1401
    (ne_u32_3, "ne_u32_3"),                 // 1402
    (ne_u32_4, "ne_u32_4"),                 // 1403
    (ne_u32_5, "ne_u32_5"),                 // 1404
    (ne_u64_1, "ne_u64_1"),                 // 1405
    (ne_u64_2, "ne_u64_2"),                 // 1406
    (ne_u64_3, "ne_u64_3"),                 // 1407
    (ne_u64_4, "ne_u64_4"),                 // 1408
    (ne_u64_5, "ne_u64_5"),                 // 1409
    (ne_u8_1, "ne_u8_1"),                   // 1410
    (ne_u8_2, "ne_u8_2"),                   // 1411
    (ne_u8_3, "ne_u8_3"),                   // 1412
    (ne_u8_4, "ne_u8_4"),                   // 1413
    (ne_u8_5, "ne_u8_5"),                   // 1414
    (neg_i16_1, "neg_i16_1"),               // 1415
    (neg_i16_2, "neg_i16_2"),               // 1416
    (neg_i16_3, "neg_i16_3"),               // 1417
    (neg_i16_4, "neg_i16_4"),               // 1418
    (neg_i16_5, "neg_i16_5"),               // 1419
    (neg_i32_1, "neg_i32_1"),               // 1420
    (neg_i32_2, "neg_i32_2"),               // 1421
    (neg_i32_3, "neg_i32_3"),               // 1422
    (neg_i32_4, "neg_i32_4"),               // 1423
    (neg_i32_5, "neg_i32_5"),               // 1424
    (neg_i64_1, "neg_i64_1"),               // 1425
    (neg_i64_2, "neg_i64_2"),               // 1426
    (neg_i64_3, "neg_i64_3"),               // 1427
    (neg_i64_4, "neg_i64_4"),               // 1428
    (neg_i64_5, "neg_i64_5"),               // 1429
    (neg_i8_1, "neg_i8_1"),                 // 1430
    (neg_i8_2, "neg_i8_2"),                 // 1431
    (neg_i8_3, "neg_i8_3"),                 // 1432
    (neg_i8_4, "neg_i8_4"),                 // 1433
    (neg_i8_5, "neg_i8_5"),                 // 1434
    (neg_u16_1, "neg_u16_1"),               // 1435
    (neg_u16_2, "neg_u16_2"),               // 1436
    (neg_u16_3, "neg_u16_3"),               // 1437
    (neg_u16_4, "neg_u16_4"),               // 1438
    (neg_u16_5, "neg_u16_5"),               // 1439
    (neg_u32_1, "neg_u32_1"),               // 1440
    (neg_u32_2, "neg_u32_2"),               // 1441
    (neg_u32_3, "neg_u32_3"),               // 1442
    (neg_u32_4, "neg_u32_4"),               // 1443
    (neg_u32_5, "neg_u32_5"),               // 1444
    (neg_u64_1, "neg_u64_1"),               // 1445
    (neg_u64_2, "neg_u64_2"),               // 1446
    (neg_u64_3, "neg_u64_3"),               // 1447
    (neg_u64_4, "neg_u64_4"),               // 1448
    (neg_u64_5, "neg_u64_5"),               // 1449
    (neg_u8_1, "neg_u8_1"),                 // 1450
    (neg_u8_2, "neg_u8_2"),                 // 1451
    (neg_u8_3, "neg_u8_3"),                 // 1452
    (neg_u8_4, "neg_u8_4"),                 // 1453
    (neg_u8_5, "neg_u8_5"),                 // 1454
    (not_bool_1, "not_bool_1"),             // 1455
    (not_bool_2, "not_bool_2"),             // 1456
    (not_bool_3, "not_bool_3"),             // 1457
    (not_bool_4, "not_bool_4"),             // 1458
    (not_bool_5, "not_bool_5"),             // 1459
    (or_bool_1, "or_bool_1"),               // 1460
    (or_bool_2, "or_bool_2"),               // 1461
    (or_bool_3, "or_bool_3"),               // 1462
    (or_bool_4, "or_bool_4"),               // 1463
    (or_bool_5, "or_bool_5"),               // 1464
    (ref_bool_1, "ref_bool_1"),             // 1465
    (ref_bool_2, "ref_bool_2"),             // 1466
    (ref_bool_3, "ref_bool_3"),             // 1467
    (ref_bool_4, "ref_bool_4"),             // 1468
    (ref_bool_5, "ref_bool_5"),             // 1469
    (ref_f32_1, "ref_f32_1"),               // 1470
    (ref_f32_2, "ref_f32_2"),               // 1471
    (ref_f32_3, "ref_f32_3"),               // 1472
    (ref_f32_4, "ref_f32_4"),               // 1473
    (ref_f32_5, "ref_f32_5"),               // 1474
    (ref_f64_1, "ref_f64_1"),               // 1475
    (ref_f64_2, "ref_f64_2"),               // 1476
    (ref_f64_3, "ref_f64_3"),               // 1477
    (ref_f64_4, "ref_f64_4"),               // 1478
    (ref_f64_5, "ref_f64_5"),               // 1479
    (ref_i16_1, "ref_i16_1"),               // 1480
    (ref_i16_2, "ref_i16_2"),               // 1481
    (ref_i16_3, "ref_i16_3"),               // 1482
    (ref_i16_4, "ref_i16_4"),               // 1483
    (ref_i16_5, "ref_i16_5"),               // 1484
    (ref_i32_1, "ref_i32_1"),               // 1485
    (ref_i32_2, "ref_i32_2"),               // 1486
    (ref_i32_3, "ref_i32_3"),               // 1487
    (ref_i32_4, "ref_i32_4"),               // 1488
    (ref_i32_5, "ref_i32_5"),               // 1489
    (ref_i64_1, "ref_i64_1"),               // 1490
    (ref_i64_2, "ref_i64_2"),               // 1491
    (ref_i64_3, "ref_i64_3"),               // 1492
    (ref_i64_4, "ref_i64_4"),               // 1493
    (ref_i64_5, "ref_i64_5"),               // 1494
    (ref_i8_1, "ref_i8_1"),                 // 1495
    (ref_i8_2, "ref_i8_2"),                 // 1496
    (ref_i8_3, "ref_i8_3"),                 // 1497
    (ref_i8_4, "ref_i8_4"),                 // 1498
    (ref_i8_5, "ref_i8_5"),                 // 1499
    (ref_u16_1, "ref_u16_1"),               // 1500
    (ref_u16_2, "ref_u16_2"),               // 1501
    (ref_u16_3, "ref_u16_3"),               // 1502
    (ref_u16_4, "ref_u16_4"),               // 1503
    (ref_u16_5, "ref_u16_5"),               // 1504
    (ref_u32_1, "ref_u32_1"),               // 1505
    (ref_u32_2, "ref_u32_2"),               // 1506
    (ref_u32_3, "ref_u32_3"),               // 1507
    (ref_u32_4, "ref_u32_4"),               // 1508
    (ref_u32_5, "ref_u32_5"),               // 1509
    (ref_u64_1, "ref_u64_1"),               // 1510
    (ref_u64_2, "ref_u64_2"),               // 1511
    (ref_u64_3, "ref_u64_3"),               // 1512
    (ref_u64_4, "ref_u64_4"),               // 1513
    (ref_u64_5, "ref_u64_5"),               // 1514
    (ref_u8_1, "ref_u8_1"),                 // 1515
    (ref_u8_2, "ref_u8_2"),                 // 1516
    (ref_u8_3, "ref_u8_3"),                 // 1517
    (ref_u8_4, "ref_u8_4"),                 // 1518
    (ref_u8_5, "ref_u8_5"),                 // 1519
    (rem_f32_1, "rem_f32_1"),               // 1520
    (rem_f32_2, "rem_f32_2"),               // 1521
    (rem_f32_3, "rem_f32_3"),               // 1522
    (rem_f32_4, "rem_f32_4"),               // 1523
    (rem_f32_5, "rem_f32_5"),               // 1524
    (rem_f64_1, "rem_f64_1"),               // 1525
    (rem_f64_2, "rem_f64_2"),               // 1526
    (rem_f64_3, "rem_f64_3"),               // 1527
    (rem_f64_4, "rem_f64_4"),               // 1528
    (rem_f64_5, "rem_f64_5"),               // 1529
    (rem_i16_1, "rem_i16_1"),               // 1530
    (rem_i16_2, "rem_i16_2"),               // 1531
    (rem_i16_3, "rem_i16_3"),               // 1532
    (rem_i16_4, "rem_i16_4"),               // 1533
    (rem_i16_5, "rem_i16_5"),               // 1534
    (rem_i32_1, "rem_i32_1"),               // 1535
    (rem_i32_2, "rem_i32_2"),               // 1536
    (rem_i32_3, "rem_i32_3"),               // 1537
    (rem_i32_4, "rem_i32_4"),               // 1538
    (rem_i32_5, "rem_i32_5"),               // 1539
    (rem_i64_1, "rem_i64_1"),               // 1540
    (rem_i64_2, "rem_i64_2"),               // 1541
    (rem_i64_3, "rem_i64_3"),               // 1542
    (rem_i64_4, "rem_i64_4"),               // 1543
    (rem_i64_5, "rem_i64_5"),               // 1544
    (rem_i8_1, "rem_i8_1"),                 // 1545
    (rem_i8_2, "rem_i8_2"),                 // 1546
    (rem_i8_3, "rem_i8_3"),                 // 1547
    (rem_i8_4, "rem_i8_4"),                 // 1548
    (rem_i8_5, "rem_i8_5"),                 // 1549
    (rem_u16_1, "rem_u16_1"),               // 1550
    (rem_u16_2, "rem_u16_2"),               // 1551
    (rem_u16_3, "rem_u16_3"),               // 1552
    (rem_u16_4, "rem_u16_4"),               // 1553
    (rem_u16_5, "rem_u16_5"),               // 1554
    (rem_u32_1, "rem_u32_1"),               // 1555
    (rem_u32_2, "rem_u32_2"),               // 1556
    (rem_u32_3, "rem_u32_3"),               // 1557
    (rem_u32_4, "rem_u32_4"),               // 1558
    (rem_u32_5, "rem_u32_5"),               // 1559
    (rem_u64_1, "rem_u64_1"),               // 1560
    (rem_u64_2, "rem_u64_2"),               // 1561
    (rem_u64_3, "rem_u64_3"),               // 1562
    (rem_u64_4, "rem_u64_4"),               // 1563
    (rem_u64_5, "rem_u64_5"),               // 1564
    (rem_u8_1, "rem_u8_1"),                 // 1565
    (rem_u8_2, "rem_u8_2"),                 // 1566
    (rem_u8_3, "rem_u8_3"),                 // 1567
    (rem_u8_4, "rem_u8_4"),                 // 1568
    (rem_u8_5, "rem_u8_5"),                 // 1569
    (reshape_1_bool_1, "reshape_1_bool_1"), // 1570
    (reshape_1_bool_2, "reshape_1_bool_2"), // 1571
    (reshape_1_bool_3, "reshape_1_bool_3"), // 1572
    (reshape_1_bool_4, "reshape_1_bool_4"), // 1573
    (reshape_1_bool_5, "reshape_1_bool_5"), // 1574
    (reshape_1_f32_1, "reshape_1_f32_1"),   // 1575
    (reshape_1_f32_2, "reshape_1_f32_2"),   // 1576
    (reshape_1_f32_3, "reshape_1_f32_3"),   // 1577
    (reshape_1_f32_4, "reshape_1_f32_4"),   // 1578
    (reshape_1_f32_5, "reshape_1_f32_5"),   // 1579
    (reshape_1_f64_1, "reshape_1_f64_1"),   // 1580
    (reshape_1_f64_2, "reshape_1_f64_2"),   // 1581
    (reshape_1_f64_3, "reshape_1_f64_3"),   // 1582
    (reshape_1_f64_4, "reshape_1_f64_4"),   // 1583
    (reshape_1_f64_5, "reshape_1_f64_5"),   // 1584
    (reshape_1_i16_1, "reshape_1_i16_1"),   // 1585
    (reshape_1_i16_2, "reshape_1_i16_2"),   // 1586
    (reshape_1_i16_3, "reshape_1_i16_3"),   // 1587
    (reshape_1_i16_4, "reshape_1_i16_4"),   // 1588
    (reshape_1_i16_5, "reshape_1_i16_5"),   // 1589
    (reshape_1_i32_1, "reshape_1_i32_1"),   // 1590
    (reshape_1_i32_2, "reshape_1_i32_2"),   // 1591
    (reshape_1_i32_3, "reshape_1_i32_3"),   // 1592
    (reshape_1_i32_4, "reshape_1_i32_4"),   // 1593
    (reshape_1_i32_5, "reshape_1_i32_5"),   // 1594
    (reshape_1_i64_1, "reshape_1_i64_1"),   // 1595
    (reshape_1_i64_2, "reshape_1_i64_2"),   // 1596
    (reshape_1_i64_3, "reshape_1_i64_3"),   // 1597
    (reshape_1_i64_4, "reshape_1_i64_4"),   // 1598
    (reshape_1_i64_5, "reshape_1_i64_5"),   // 1599
    (reshape_1_i8_1, "reshape_1_i8_1"),     // 1600
    (reshape_1_i8_2, "reshape_1_i8_2"),     // 1601
    (reshape_1_i8_3, "reshape_1_i8_3"),     // 1602
    (reshape_1_i8_4, "reshape_1_i8_4"),     // 1603
    (reshape_1_i8_5, "reshape_1_i8_5"),     // 1604
    (reshape_1_u16_1, "reshape_1_u16_1"),   // 1605
    (reshape_1_u16_2, "reshape_1_u16_2"),   // 1606
    (reshape_1_u16_3, "reshape_1_u16_3"),   // 1607
    (reshape_1_u16_4, "reshape_1_u16_4"),   // 1608
    (reshape_1_u16_5, "reshape_1_u16_5"),   // 1609
    (reshape_1_u32_1, "reshape_1_u32_1"),   // 1610
    (reshape_1_u32_2, "reshape_1_u32_2"),   // 1611
    (reshape_1_u32_3, "reshape_1_u32_3"),   // 1612
    (reshape_1_u32_4, "reshape_1_u32_4"),   // 1613
    (reshape_1_u32_5, "reshape_1_u32_5"),   // 1614
    (reshape_1_u64_1, "reshape_1_u64_1"),   // 1615
    (reshape_1_u64_2, "reshape_1_u64_2"),   // 1616
    (reshape_1_u64_3, "reshape_1_u64_3"),   // 1617
    (reshape_1_u64_4, "reshape_1_u64_4"),   // 1618
    (reshape_1_u64_5, "reshape_1_u64_5"),   // 1619
    (reshape_1_u8_1, "reshape_1_u8_1"),     // 1620
    (reshape_1_u8_2, "reshape_1_u8_2"),     // 1621
    (reshape_1_u8_3, "reshape_1_u8_3"),     // 1622
    (reshape_1_u8_4, "reshape_1_u8_4"),     // 1623
    (reshape_1_u8_5, "reshape_1_u8_5"),     // 1624
    (reshape_2_bool_1, "reshape_2_bool_1"), // 1625
    (reshape_2_bool_2, "reshape_2_bool_2"), // 1626
    (reshape_2_bool_3, "reshape_2_bool_3"), // 1627
    (reshape_2_bool_4, "reshape_2_bool_4"), // 1628
    (reshape_2_bool_5, "reshape_2_bool_5"), // 1629
    (reshape_2_f32_1, "reshape_2_f32_1"),   // 1630
    (reshape_2_f32_2, "reshape_2_f32_2"),   // 1631
    (reshape_2_f32_3, "reshape_2_f32_3"),   // 1632
    (reshape_2_f32_4, "reshape_2_f32_4"),   // 1633
    (reshape_2_f32_5, "reshape_2_f32_5"),   // 1634
    (reshape_2_f64_1, "reshape_2_f64_1"),   // 1635
    (reshape_2_f64_2, "reshape_2_f64_2"),   // 1636
    (reshape_2_f64_3, "reshape_2_f64_3"),   // 1637
    (reshape_2_f64_4, "reshape_2_f64_4"),   // 1638
    (reshape_2_f64_5, "reshape_2_f64_5"),   // 1639
    (reshape_2_i16_1, "reshape_2_i16_1"),   // 1640
    (reshape_2_i16_2, "reshape_2_i16_2"),   // 1641
    (reshape_2_i16_3, "reshape_2_i16_3"),   // 1642
    (reshape_2_i16_4, "reshape_2_i16_4"),   // 1643
    (reshape_2_i16_5, "reshape_2_i16_5"),   // 1644
    (reshape_2_i32_1, "reshape_2_i32_1"),   // 1645
    (reshape_2_i32_2, "reshape_2_i32_2"),   // 1646
    (reshape_2_i32_3, "reshape_2_i32_3"),   // 1647
    (reshape_2_i32_4, "reshape_2_i32_4"),   // 1648
    (reshape_2_i32_5, "reshape_2_i32_5"),   // 1649
    (reshape_2_i64_1, "reshape_2_i64_1"),   // 1650
    (reshape_2_i64_2, "reshape_2_i64_2"),   // 1651
    (reshape_2_i64_3, "reshape_2_i64_3"),   // 1652
    (reshape_2_i64_4, "reshape_2_i64_4"),   // 1653
    (reshape_2_i64_5, "reshape_2_i64_5"),   // 1654
    (reshape_2_i8_1, "reshape_2_i8_1"),     // 1655
    (reshape_2_i8_2, "reshape_2_i8_2"),     // 1656
    (reshape_2_i8_3, "reshape_2_i8_3"),     // 1657
    (reshape_2_i8_4, "reshape_2_i8_4"),     // 1658
    (reshape_2_i8_5, "reshape_2_i8_5"),     // 1659
    (reshape_2_u16_1, "reshape_2_u16_1"),   // 1660
    (reshape_2_u16_2, "reshape_2_u16_2"),   // 1661
    (reshape_2_u16_3, "reshape_2_u16_3"),   // 1662
    (reshape_2_u16_4, "reshape_2_u16_4"),   // 1663
    (reshape_2_u16_5, "reshape_2_u16_5"),   // 1664
    (reshape_2_u32_1, "reshape_2_u32_1"),   // 1665
    (reshape_2_u32_2, "reshape_2_u32_2"),   // 1666
    (reshape_2_u32_3, "reshape_2_u32_3"),   // 1667
    (reshape_2_u32_4, "reshape_2_u32_4"),   // 1668
    (reshape_2_u32_5, "reshape_2_u32_5"),   // 1669
    (reshape_2_u64_1, "reshape_2_u64_1"),   // 1670
    (reshape_2_u64_2, "reshape_2_u64_2"),   // 1671
    (reshape_2_u64_3, "reshape_2_u64_3"),   // 1672
    (reshape_2_u64_4, "reshape_2_u64_4"),   // 1673
    (reshape_2_u64_5, "reshape_2_u64_5"),   // 1674
    (reshape_2_u8_1, "reshape_2_u8_1"),     // 1675
    (reshape_2_u8_2, "reshape_2_u8_2"),     // 1676
    (reshape_2_u8_3, "reshape_2_u8_3"),     // 1677
    (reshape_2_u8_4, "reshape_2_u8_4"),     // 1678
    (reshape_2_u8_5, "reshape_2_u8_5"),     // 1679
    (reshape_3_bool_1, "reshape_3_bool_1"), // 1680
    (reshape_3_bool_2, "reshape_3_bool_2"), // 1681
    (reshape_3_bool_3, "reshape_3_bool_3"), // 1682
    (reshape_3_bool_4, "reshape_3_bool_4"), // 1683
    (reshape_3_bool_5, "reshape_3_bool_5"), // 1684
    (reshape_3_f32_1, "reshape_3_f32_1"),   // 1685
    (reshape_3_f32_2, "reshape_3_f32_2"),   // 1686
    (reshape_3_f32_3, "reshape_3_f32_3"),   // 1687
    (reshape_3_f32_4, "reshape_3_f32_4"),   // 1688
    (reshape_3_f32_5, "reshape_3_f32_5"),   // 1689
    (reshape_3_f64_1, "reshape_3_f64_1"),   // 1690
    (reshape_3_f64_2, "reshape_3_f64_2"),   // 1691
    (reshape_3_f64_3, "reshape_3_f64_3"),   // 1692
    (reshape_3_f64_4, "reshape_3_f64_4"),   // 1693
    (reshape_3_f64_5, "reshape_3_f64_5"),   // 1694
    (reshape_3_i16_1, "reshape_3_i16_1"),   // 1695
    (reshape_3_i16_2, "reshape_3_i16_2"),   // 1696
    (reshape_3_i16_3, "reshape_3_i16_3"),   // 1697
    (reshape_3_i16_4, "reshape_3_i16_4"),   // 1698
    (reshape_3_i16_5, "reshape_3_i16_5"),   // 1699
    (reshape_3_i32_1, "reshape_3_i32_1"),   // 1700
    (reshape_3_i32_2, "reshape_3_i32_2"),   // 1701
    (reshape_3_i32_3, "reshape_3_i32_3"),   // 1702
    (reshape_3_i32_4, "reshape_3_i32_4"),   // 1703
    (reshape_3_i32_5, "reshape_3_i32_5"),   // 1704
    (reshape_3_i64_1, "reshape_3_i64_1"),   // 1705
    (reshape_3_i64_2, "reshape_3_i64_2"),   // 1706
    (reshape_3_i64_3, "reshape_3_i64_3"),   // 1707
    (reshape_3_i64_4, "reshape_3_i64_4"),   // 1708
    (reshape_3_i64_5, "reshape_3_i64_5"),   // 1709
    (reshape_3_i8_1, "reshape_3_i8_1"),     // 1710
    (reshape_3_i8_2, "reshape_3_i8_2"),     // 1711
    (reshape_3_i8_3, "reshape_3_i8_3"),     // 1712
    (reshape_3_i8_4, "reshape_3_i8_4"),     // 1713
    (reshape_3_i8_5, "reshape_3_i8_5"),     // 1714
    (reshape_3_u16_1, "reshape_3_u16_1"),   // 1715
    (reshape_3_u16_2, "reshape_3_u16_2"),   // 1716
    (reshape_3_u16_3, "reshape_3_u16_3"),   // 1717
    (reshape_3_u16_4, "reshape_3_u16_4"),   // 1718
    (reshape_3_u16_5, "reshape_3_u16_5"),   // 1719
    (reshape_3_u32_1, "reshape_3_u32_1"),   // 1720
    (reshape_3_u32_2, "reshape_3_u32_2"),   // 1721
    (reshape_3_u32_3, "reshape_3_u32_3"),   // 1722
    (reshape_3_u32_4, "reshape_3_u32_4"),   // 1723
    (reshape_3_u32_5, "reshape_3_u32_5"),   // 1724
    (reshape_3_u64_1, "reshape_3_u64_1"),   // 1725
    (reshape_3_u64_2, "reshape_3_u64_2"),   // 1726
    (reshape_3_u64_3, "reshape_3_u64_3"),   // 1727
    (reshape_3_u64_4, "reshape_3_u64_4"),   // 1728
    (reshape_3_u64_5, "reshape_3_u64_5"),   // 1729
    (reshape_3_u8_1, "reshape_3_u8_1"),     // 1730
    (reshape_3_u8_2, "reshape_3_u8_2"),     // 1731
    (reshape_3_u8_3, "reshape_3_u8_3"),     // 1732
    (reshape_3_u8_4, "reshape_3_u8_4"),     // 1733
    (reshape_3_u8_5, "reshape_3_u8_5"),     // 1734
    (reshape_4_bool_1, "reshape_4_bool_1"), // 1735
    (reshape_4_bool_2, "reshape_4_bool_2"), // 1736
    (reshape_4_bool_3, "reshape_4_bool_3"), // 1737
    (reshape_4_bool_4, "reshape_4_bool_4"), // 1738
    (reshape_4_bool_5, "reshape_4_bool_5"), // 1739
    (reshape_4_f32_1, "reshape_4_f32_1"),   // 1740
    (reshape_4_f32_2, "reshape_4_f32_2"),   // 1741
    (reshape_4_f32_3, "reshape_4_f32_3"),   // 1742
    (reshape_4_f32_4, "reshape_4_f32_4"),   // 1743
    (reshape_4_f32_5, "reshape_4_f32_5"),   // 1744
    (reshape_4_f64_1, "reshape_4_f64_1"),   // 1745
    (reshape_4_f64_2, "reshape_4_f64_2"),   // 1746
    (reshape_4_f64_3, "reshape_4_f64_3"),   // 1747
    (reshape_4_f64_4, "reshape_4_f64_4"),   // 1748
    (reshape_4_f64_5, "reshape_4_f64_5"),   // 1749
    (reshape_4_i16_1, "reshape_4_i16_1"),   // 1750
    (reshape_4_i16_2, "reshape_4_i16_2"),   // 1751
    (reshape_4_i16_3, "reshape_4_i16_3"),   // 1752
    (reshape_4_i16_4, "reshape_4_i16_4"),   // 1753
    (reshape_4_i16_5, "reshape_4_i16_5"),   // 1754
    (reshape_4_i32_1, "reshape_4_i32_1"),   // 1755
    (reshape_4_i32_2, "reshape_4_i32_2"),   // 1756
    (reshape_4_i32_3, "reshape_4_i32_3"),   // 1757
    (reshape_4_i32_4, "reshape_4_i32_4"),   // 1758
    (reshape_4_i32_5, "reshape_4_i32_5"),   // 1759
    (reshape_4_i64_1, "reshape_4_i64_1"),   // 1760
    (reshape_4_i64_2, "reshape_4_i64_2"),   // 1761
    (reshape_4_i64_3, "reshape_4_i64_3"),   // 1762
    (reshape_4_i64_4, "reshape_4_i64_4"),   // 1763
    (reshape_4_i64_5, "reshape_4_i64_5"),   // 1764
    (reshape_4_i8_1, "reshape_4_i8_1"),     // 1765
    (reshape_4_i8_2, "reshape_4_i8_2"),     // 1766
    (reshape_4_i8_3, "reshape_4_i8_3"),     // 1767
    (reshape_4_i8_4, "reshape_4_i8_4"),     // 1768
    (reshape_4_i8_5, "reshape_4_i8_5"),     // 1769
    (reshape_4_u16_1, "reshape_4_u16_1"),   // 1770
    (reshape_4_u16_2, "reshape_4_u16_2"),   // 1771
    (reshape_4_u16_3, "reshape_4_u16_3"),   // 1772
    (reshape_4_u16_4, "reshape_4_u16_4"),   // 1773
    (reshape_4_u16_5, "reshape_4_u16_5"),   // 1774
    (reshape_4_u32_1, "reshape_4_u32_1"),   // 1775
    (reshape_4_u32_2, "reshape_4_u32_2"),   // 1776
    (reshape_4_u32_3, "reshape_4_u32_3"),   // 1777
    (reshape_4_u32_4, "reshape_4_u32_4"),   // 1778
    (reshape_4_u32_5, "reshape_4_u32_5"),   // 1779
    (reshape_4_u64_1, "reshape_4_u64_1"),   // 1780
    (reshape_4_u64_2, "reshape_4_u64_2"),   // 1781
    (reshape_4_u64_3, "reshape_4_u64_3"),   // 1782
    (reshape_4_u64_4, "reshape_4_u64_4"),   // 1783
    (reshape_4_u64_5, "reshape_4_u64_5"),   // 1784
    (reshape_4_u8_1, "reshape_4_u8_1"),     // 1785
    (reshape_4_u8_2, "reshape_4_u8_2"),     // 1786
    (reshape_4_u8_3, "reshape_4_u8_3"),     // 1787
    (reshape_4_u8_4, "reshape_4_u8_4"),     // 1788
    (reshape_4_u8_5, "reshape_4_u8_5"),     // 1789
    (reshape_5_bool_1, "reshape_5_bool_1"), // 1790
    (reshape_5_bool_2, "reshape_5_bool_2"), // 1791
    (reshape_5_bool_3, "reshape_5_bool_3"), // 1792
    (reshape_5_bool_4, "reshape_5_bool_4"), // 1793
    (reshape_5_bool_5, "reshape_5_bool_5"), // 1794
    (reshape_5_f32_1, "reshape_5_f32_1"),   // 1795
    (reshape_5_f32_2, "reshape_5_f32_2"),   // 1796
    (reshape_5_f32_3, "reshape_5_f32_3"),   // 1797
    (reshape_5_f32_4, "reshape_5_f32_4"),   // 1798
    (reshape_5_f32_5, "reshape_5_f32_5"),   // 1799
    (reshape_5_f64_1, "reshape_5_f64_1"),   // 1800
    (reshape_5_f64_2, "reshape_5_f64_2"),   // 1801
    (reshape_5_f64_3, "reshape_5_f64_3"),   // 1802
    (reshape_5_f64_4, "reshape_5_f64_4"),   // 1803
    (reshape_5_f64_5, "reshape_5_f64_5"),   // 1804
    (reshape_5_i16_1, "reshape_5_i16_1"),   // 1805
    (reshape_5_i16_2, "reshape_5_i16_2"),   // 1806
    (reshape_5_i16_3, "reshape_5_i16_3"),   // 1807
    (reshape_5_i16_4, "reshape_5_i16_4"),   // 1808
    (reshape_5_i16_5, "reshape_5_i16_5"),   // 1809
    (reshape_5_i32_1, "reshape_5_i32_1"),   // 1810
    (reshape_5_i32_2, "reshape_5_i32_2"),   // 1811
    (reshape_5_i32_3, "reshape_5_i32_3"),   // 1812
    (reshape_5_i32_4, "reshape_5_i32_4"),   // 1813
    (reshape_5_i32_5, "reshape_5_i32_5"),   // 1814
    (reshape_5_i64_1, "reshape_5_i64_1"),   // 1815
    (reshape_5_i64_2, "reshape_5_i64_2"),   // 1816
    (reshape_5_i64_3, "reshape_5_i64_3"),   // 1817
    (reshape_5_i64_4, "reshape_5_i64_4"),   // 1818
    (reshape_5_i64_5, "reshape_5_i64_5"),   // 1819
    (reshape_5_i8_1, "reshape_5_i8_1"),     // 1820
    (reshape_5_i8_2, "reshape_5_i8_2"),     // 1821
    (reshape_5_i8_3, "reshape_5_i8_3"),     // 1822
    (reshape_5_i8_4, "reshape_5_i8_4"),     // 1823
    (reshape_5_i8_5, "reshape_5_i8_5"),     // 1824
    (reshape_5_u16_1, "reshape_5_u16_1"),   // 1825
    (reshape_5_u16_2, "reshape_5_u16_2"),   // 1826
    (reshape_5_u16_3, "reshape_5_u16_3"),   // 1827
    (reshape_5_u16_4, "reshape_5_u16_4"),   // 1828
    (reshape_5_u16_5, "reshape_5_u16_5"),   // 1829
    (reshape_5_u32_1, "reshape_5_u32_1"),   // 1830
    (reshape_5_u32_2, "reshape_5_u32_2"),   // 1831
    (reshape_5_u32_3, "reshape_5_u32_3"),   // 1832
    (reshape_5_u32_4, "reshape_5_u32_4"),   // 1833
    (reshape_5_u32_5, "reshape_5_u32_5"),   // 1834
    (reshape_5_u64_1, "reshape_5_u64_1"),   // 1835
    (reshape_5_u64_2, "reshape_5_u64_2"),   // 1836
    (reshape_5_u64_3, "reshape_5_u64_3"),   // 1837
    (reshape_5_u64_4, "reshape_5_u64_4"),   // 1838
    (reshape_5_u64_5, "reshape_5_u64_5"),   // 1839
    (reshape_5_u8_1, "reshape_5_u8_1"),     // 1840
    (reshape_5_u8_2, "reshape_5_u8_2"),     // 1841
    (reshape_5_u8_3, "reshape_5_u8_3"),     // 1842
    (reshape_5_u8_4, "reshape_5_u8_4"),     // 1843
    (reshape_5_u8_5, "reshape_5_u8_5"),     // 1844
    (shl_i16_1, "shl_i16_1"),               // 1845
    (shl_i16_2, "shl_i16_2"),               // 1846
    (shl_i16_3, "shl_i16_3"),               // 1847
    (shl_i16_4, "shl_i16_4"),               // 1848
    (shl_i16_5, "shl_i16_5"),               // 1849
    (shl_i32_1, "shl_i32_1"),               // 1850
    (shl_i32_2, "shl_i32_2"),               // 1851
    (shl_i32_3, "shl_i32_3"),               // 1852
    (shl_i32_4, "shl_i32_4"),               // 1853
    (shl_i32_5, "shl_i32_5"),               // 1854
    (shl_i64_1, "shl_i64_1"),               // 1855
    (shl_i64_2, "shl_i64_2"),               // 1856
    (shl_i64_3, "shl_i64_3"),               // 1857
    (shl_i64_4, "shl_i64_4"),               // 1858
    (shl_i64_5, "shl_i64_5"),               // 1859
    (shl_i8_1, "shl_i8_1"),                 // 1860
    (shl_i8_2, "shl_i8_2"),                 // 1861
    (shl_i8_3, "shl_i8_3"),                 // 1862
    (shl_i8_4, "shl_i8_4"),                 // 1863
    (shl_i8_5, "shl_i8_5"),                 // 1864
    (shl_u16_1, "shl_u16_1"),               // 1865
    (shl_u16_2, "shl_u16_2"),               // 1866
    (shl_u16_3, "shl_u16_3"),               // 1867
    (shl_u16_4, "shl_u16_4"),               // 1868
    (shl_u16_5, "shl_u16_5"),               // 1869
    (shl_u32_1, "shl_u32_1"),               // 1870
    (shl_u32_2, "shl_u32_2"),               // 1871
    (shl_u32_3, "shl_u32_3"),               // 1872
    (shl_u32_4, "shl_u32_4"),               // 1873
    (shl_u32_5, "shl_u32_5"),               // 1874
    (shl_u64_1, "shl_u64_1"),               // 1875
    (shl_u64_2, "shl_u64_2"),               // 1876
    (shl_u64_3, "shl_u64_3"),               // 1877
    (shl_u64_4, "shl_u64_4"),               // 1878
    (shl_u64_5, "shl_u64_5"),               // 1879
    (shl_u8_1, "shl_u8_1"),                 // 1880
    (shl_u8_2, "shl_u8_2"),                 // 1881
    (shl_u8_3, "shl_u8_3"),                 // 1882
    (shl_u8_4, "shl_u8_4"),                 // 1883
    (shl_u8_5, "shl_u8_5"),                 // 1884
    (shr_i16_1, "shr_i16_1"),               // 1885
    (shr_i16_2, "shr_i16_2"),               // 1886
    (shr_i16_3, "shr_i16_3"),               // 1887
    (shr_i16_4, "shr_i16_4"),               // 1888
    (shr_i16_5, "shr_i16_5"),               // 1889
    (shr_i32_1, "shr_i32_1"),               // 1890
    (shr_i32_2, "shr_i32_2"),               // 1891
    (shr_i32_3, "shr_i32_3"),               // 1892
    (shr_i32_4, "shr_i32_4"),               // 1893
    (shr_i32_5, "shr_i32_5"),               // 1894
    (shr_i64_1, "shr_i64_1"),               // 1895
    (shr_i64_2, "shr_i64_2"),               // 1896
    (shr_i64_3, "shr_i64_3"),               // 1897
    (shr_i64_4, "shr_i64_4"),               // 1898
    (shr_i64_5, "shr_i64_5"),               // 1899
    (shr_i8_1, "shr_i8_1"),                 // 1900
    (shr_i8_2, "shr_i8_2"),                 // 1901
    (shr_i8_3, "shr_i8_3"),                 // 1902
    (shr_i8_4, "shr_i8_4"),                 // 1903
    (shr_i8_5, "shr_i8_5"),                 // 1904
    (shr_u16_1, "shr_u16_1"),               // 1905
    (shr_u16_2, "shr_u16_2"),               // 1906
    (shr_u16_3, "shr_u16_3"),               // 1907
    (shr_u16_4, "shr_u16_4"),               // 1908
    (shr_u16_5, "shr_u16_5"),               // 1909
    (shr_u32_1, "shr_u32_1"),               // 1910
    (shr_u32_2, "shr_u32_2"),               // 1911
    (shr_u32_3, "shr_u32_3"),               // 1912
    (shr_u32_4, "shr_u32_4"),               // 1913
    (shr_u32_5, "shr_u32_5"),               // 1914
    (shr_u64_1, "shr_u64_1"),               // 1915
    (shr_u64_2, "shr_u64_2"),               // 1916
    (shr_u64_3, "shr_u64_3"),               // 1917
    (shr_u64_4, "shr_u64_4"),               // 1918
    (shr_u64_5, "shr_u64_5"),               // 1919
    (shr_u8_1, "shr_u8_1"),                 // 1920
    (shr_u8_2, "shr_u8_2"),                 // 1921
    (shr_u8_3, "shr_u8_3"),                 // 1922
    (shr_u8_4, "shr_u8_4"),                 // 1923
    (shr_u8_5, "shr_u8_5"),                 // 1924
    (slice_bool_1, "slice_bool_1"),         // 1925
    (slice_bool_2, "slice_bool_2"),         // 1926
    (slice_bool_3, "slice_bool_3"),         // 1927
    (slice_bool_4, "slice_bool_4"),         // 1928
    (slice_bool_5, "slice_bool_5"),         // 1929
    (slice_f32_1, "slice_f32_1"),           // 1930
    (slice_f32_2, "slice_f32_2"),           // 1931
    (slice_f32_3, "slice_f32_3"),           // 1932
    (slice_f32_4, "slice_f32_4"),           // 1933
    (slice_f32_5, "slice_f32_5"),           // 1934
    (slice_f64_1, "slice_f64_1"),           // 1935
    (slice_f64_2, "slice_f64_2"),           // 1936
    (slice_f64_3, "slice_f64_3"),           // 1937
    (slice_f64_4, "slice_f64_4"),           // 1938
    (slice_f64_5, "slice_f64_5"),           // 1939
    (slice_i16_1, "slice_i16_1"),           // 1940
    (slice_i16_2, "slice_i16_2"),           // 1941
    (slice_i16_3, "slice_i16_3"),           // 1942
    (slice_i16_4, "slice_i16_4"),           // 1943
    (slice_i16_5, "slice_i16_5"),           // 1944
    (slice_i32_1, "slice_i32_1"),           // 1945
    (slice_i32_2, "slice_i32_2"),           // 1946
    (slice_i32_3, "slice_i32_3"),           // 1947
    (slice_i32_4, "slice_i32_4"),           // 1948
    (slice_i32_5, "slice_i32_5"),           // 1949
    (slice_i64_1, "slice_i64_1"),           // 1950
    (slice_i64_2, "slice_i64_2"),           // 1951
    (slice_i64_3, "slice_i64_3"),           // 1952
    (slice_i64_4, "slice_i64_4"),           // 1953
    (slice_i64_5, "slice_i64_5"),           // 1954
    (slice_i8_1, "slice_i8_1"),             // 1955
    (slice_i8_2, "slice_i8_2"),             // 1956
    (slice_i8_3, "slice_i8_3"),             // 1957
    (slice_i8_4, "slice_i8_4"),             // 1958
    (slice_i8_5, "slice_i8_5"),             // 1959
    (slice_u16_1, "slice_u16_1"),           // 1960
    (slice_u16_2, "slice_u16_2"),           // 1961
    (slice_u16_3, "slice_u16_3"),           // 1962
    (slice_u16_4, "slice_u16_4"),           // 1963
    (slice_u16_5, "slice_u16_5"),           // 1964
    (slice_u32_1, "slice_u32_1"),           // 1965
    (slice_u32_2, "slice_u32_2"),           // 1966
    (slice_u32_3, "slice_u32_3"),           // 1967
    (slice_u32_4, "slice_u32_4"),           // 1968
    (slice_u32_5, "slice_u32_5"),           // 1969
    (slice_u64_1, "slice_u64_1"),           // 1970
    (slice_u64_2, "slice_u64_2"),           // 1971
    (slice_u64_3, "slice_u64_3"),           // 1972
    (slice_u64_4, "slice_u64_4"),           // 1973
    (slice_u64_5, "slice_u64_5"),           // 1974
    (slice_u8_1, "slice_u8_1"),             // 1975
    (slice_u8_2, "slice_u8_2"),             // 1976
    (slice_u8_3, "slice_u8_3"),             // 1977
    (slice_u8_4, "slice_u8_4"),             // 1978
    (slice_u8_5, "slice_u8_5"),             // 1979
    (step_bool_1, "step_bool_1"),           // 1980
    (step_bool_2, "step_bool_2"),           // 1981
    (step_bool_3, "step_bool_3"),           // 1982
    (step_bool_4, "step_bool_4"),           // 1983
    (step_bool_5, "step_bool_5"),           // 1984
    (step_f32_1, "step_f32_1"),             // 1985
    (step_f32_2, "step_f32_2"),             // 1986
    (step_f32_3, "step_f32_3"),             // 1987
    (step_f32_4, "step_f32_4"),             // 1988
    (step_f32_5, "step_f32_5"),             // 1989
    (step_f64_1, "step_f64_1"),             // 1990
    (step_f64_2, "step_f64_2"),             // 1991
    (step_f64_3, "step_f64_3"),             // 1992
    (step_f64_4, "step_f64_4"),             // 1993
    (step_f64_5, "step_f64_5"),             // 1994
    (step_i16_1, "step_i16_1"),             // 1995
    (step_i16_2, "step_i16_2"),             // 1996
    (step_i16_3, "step_i16_3"),             // 1997
    (step_i16_4, "step_i16_4"),             // 1998
    (step_i16_5, "step_i16_5"),             // 1999
    (step_i32_1, "step_i32_1"),             // 2000
    (step_i32_2, "step_i32_2"),             // 2001
    (step_i32_3, "step_i32_3"),             // 2002
    (step_i32_4, "step_i32_4"),             // 2003
    (step_i32_5, "step_i32_5"),             // 2004
    (step_i64_1, "step_i64_1"),             // 2005
    (step_i64_2, "step_i64_2"),             // 2006
    (step_i64_3, "step_i64_3"),             // 2007
    (step_i64_4, "step_i64_4"),             // 2008
    (step_i64_5, "step_i64_5"),             // 2009
    (step_i8_1, "step_i8_1"),               // 2010
    (step_i8_2, "step_i8_2"),               // 2011
    (step_i8_3, "step_i8_3"),               // 2012
    (step_i8_4, "step_i8_4"),               // 2013
    (step_i8_5, "step_i8_5"),               // 2014
    (step_u16_1, "step_u16_1"),             // 2015
    (step_u16_2, "step_u16_2"),             // 2016
    (step_u16_3, "step_u16_3"),             // 2017
    (step_u16_4, "step_u16_4"),             // 2018
    (step_u16_5, "step_u16_5"),             // 2019
    (step_u32_1, "step_u32_1"),             // 2020
    (step_u32_2, "step_u32_2"),             // 2021
    (step_u32_3, "step_u32_3"),             // 2022
    (step_u32_4, "step_u32_4"),             // 2023
    (step_u32_5, "step_u32_5"),             // 2024
    (step_u64_1, "step_u64_1"),             // 2025
    (step_u64_2, "step_u64_2"),             // 2026
    (step_u64_3, "step_u64_3"),             // 2027
    (step_u64_4, "step_u64_4"),             // 2028
    (step_u64_5, "step_u64_5"),             // 2029
    (step_u8_1, "step_u8_1"),               // 2030
    (step_u8_2, "step_u8_2"),               // 2031
    (step_u8_3, "step_u8_3"),               // 2032
    (step_u8_4, "step_u8_4"),               // 2033
    (step_u8_5, "step_u8_5"),               // 2034
    (sub_f32_1, "sub_f32_1"),               // 2035
    (sub_f32_2, "sub_f32_2"),               // 2036
    (sub_f32_3, "sub_f32_3"),               // 2037
    (sub_f32_4, "sub_f32_4"),               // 2038
    (sub_f32_5, "sub_f32_5"),               // 2039
    (sub_f64_1, "sub_f64_1"),               // 2040
    (sub_f64_2, "sub_f64_2"),               // 2041
    (sub_f64_3, "sub_f64_3"),               // 2042
    (sub_f64_4, "sub_f64_4"),               // 2043
    (sub_f64_5, "sub_f64_5"),               // 2044
    (sub_i16_1, "sub_i16_1"),               // 2045
    (sub_i16_2, "sub_i16_2"),               // 2046
    (sub_i16_3, "sub_i16_3"),               // 2047
    (sub_i16_4, "sub_i16_4"),               // 2048
    (sub_i16_5, "sub_i16_5"),               // 2049
    (sub_i32_1, "sub_i32_1"),               // 2050
    (sub_i32_2, "sub_i32_2"),               // 2051
    (sub_i32_3, "sub_i32_3"),               // 2052
    (sub_i32_4, "sub_i32_4"),               // 2053
    (sub_i32_5, "sub_i32_5"),               // 2054
    (sub_i64_1, "sub_i64_1"),               // 2055
    (sub_i64_2, "sub_i64_2"),               // 2056
    (sub_i64_3, "sub_i64_3"),               // 2057
    (sub_i64_4, "sub_i64_4"),               // 2058
    (sub_i64_5, "sub_i64_5"),               // 2059
    (sub_i8_1, "sub_i8_1"),                 // 2060
    (sub_i8_2, "sub_i8_2"),                 // 2061
    (sub_i8_3, "sub_i8_3"),                 // 2062
    (sub_i8_4, "sub_i8_4"),                 // 2063
    (sub_i8_5, "sub_i8_5"),                 // 2064
    (sub_u16_1, "sub_u16_1"),               // 2065
    (sub_u16_2, "sub_u16_2"),               // 2066
    (sub_u16_3, "sub_u16_3"),               // 2067
    (sub_u16_4, "sub_u16_4"),               // 2068
    (sub_u16_5, "sub_u16_5"),               // 2069
    (sub_u32_1, "sub_u32_1"),               // 2070
    (sub_u32_2, "sub_u32_2"),               // 2071
    (sub_u32_3, "sub_u32_3"),               // 2072
    (sub_u32_4, "sub_u32_4"),               // 2073
    (sub_u32_5, "sub_u32_5"),               // 2074
    (sub_u64_1, "sub_u64_1"),               // 2075
    (sub_u64_2, "sub_u64_2"),               // 2076
    (sub_u64_3, "sub_u64_3"),               // 2077
    (sub_u64_4, "sub_u64_4"),               // 2078
    (sub_u64_5, "sub_u64_5"),               // 2079
    (sub_u8_1, "sub_u8_1"),                 // 2080
    (sub_u8_2, "sub_u8_2"),                 // 2081
    (sub_u8_3, "sub_u8_3"),                 // 2082
    (sub_u8_4, "sub_u8_4"),                 // 2083
    (sub_u8_5, "sub_u8_5"),                 // 2084
    (xor_bool_1, "xor_bool_1"),             // 2085
    (xor_bool_2, "xor_bool_2"),             // 2086
    (xor_bool_3, "xor_bool_3"),             // 2087
    (xor_bool_4, "xor_bool_4"),             // 2088
    (xor_bool_5, "xor_bool_5"),             // 2089
];

fn add_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn add_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x + y).to_array()));
}

fn and_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn and_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn and_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn and_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn and_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_and_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x & y).to_array()));
}

fn bit_or_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_or_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn bit_xor_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn bit_xor_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn cast_f32_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f32_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f32).to_array()));
}

fn cast_f64_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_f64_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as f64).to_array()));
}

fn cast_i16_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i16_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i16).to_array()));
}

fn cast_i32_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i32_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i32).to_array()));
}

fn cast_i64_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i64_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i64).to_array()));
}

fn cast_i8_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_i8_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as i8).to_array()));
}

fn cast_u16_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u16_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u16).to_array()));
}

fn cast_u32_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u32_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u32).to_array()));
}

fn cast_u64_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u64_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u64).to_array()));
}

fn cast_u8_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_f64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn cast_u8_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as u8).to_array()));
}

fn div_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn div_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x / y).to_array()));
}

fn eq_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn eq_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x == y).to_array()));
}

fn expand_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn expand_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<1>()).to_array(),
    ));
}

fn expand_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<2>()).to_array(),
    ));
}

fn expand_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<3>()).to_array(),
    ));
}

fn expand_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<4>()).to_array(),
    ));
}

fn expand_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().expand(code.read_shape::<5>()).to_array(),
    ));
}

fn fill_bool_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_bool().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_bool_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_bool().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_bool_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_bool().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_bool_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_bool().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_bool_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_bool().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f32_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_f32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f32_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_f32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f32_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_f32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f32_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_f32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f32_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_f32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f64_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_f64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f64_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_f64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f64_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_f64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f64_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_f64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_f64_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_f64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i16_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_i16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i16_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_i16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i16_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_i16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i16_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_i16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i16_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_i16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i32_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_i32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i32_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_i32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i32_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_i32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i32_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_i32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i32_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_i32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i64_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_i64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i64_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_i64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i64_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_i64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i64_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_i64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i64_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_i64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i8_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_i8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i8_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_i8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i8_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_i8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i8_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_i8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_i8_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_i8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u16_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_u16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u16_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_u16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u16_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_u16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u16_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_u16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u16_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_u16().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u32_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_u32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u32_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_u32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u32_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_u32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u32_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_u32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u32_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_u32().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u64_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_u64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u64_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_u64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u64_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_u64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u64_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_u64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u64_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_u64().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u8_1(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<1>();
    let v = code.read_u8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u8_2(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<2>();
    let v = code.read_u8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u8_3(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<3>();
    let v = code.read_u8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u8_4(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<4>();
    let v = code.read_u8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn fill_u8_5(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<5>();
    let v = code.read_u8().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}

fn flip_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn flip_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<1>()).to_array(),
    ));
}

fn flip_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<2>()).to_array(),
    ));
}

fn flip_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<3>()).to_array(),
    ));
}

fn flip_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<4>()).to_array(),
    ));
}

fn flip_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().flip(code.read_mask::<5>()).to_array(),
    ));
}

fn ge_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn ge_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >= y).to_array()));
}

fn gt_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn gt_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x > y).to_array()));
}

fn le_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn le_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x <= y).to_array()));
}

fn lt_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn lt_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x < y).to_array()));
}

fn max_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::max(x, y)).to_array(),
    ));
}

fn max_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::max(x, y)).to_array(),
    ));
}

fn max_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::max(x, y)).to_array(),
    ));
}

fn max_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::max(x, y)).to_array(),
    ));
}

fn max_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::max(x, y)).to_array(),
    ));
}

fn max_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::max(x, y)).to_array(),
    ));
}

fn max_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::max(x, y)).to_array(),
    ));
}

fn max_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::max(x, y)).to_array(),
    ));
}

fn max_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::max(x, y)).to_array(),
    ));
}

fn max_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::max(x, y)).to_array(),
    ));
}

fn max_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::max(x, y)).to_array(),
    ));
}

fn max_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::max(x, y)).to_array(),
    ));
}

fn max_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::max(x, y)).to_array(),
    ));
}

fn max_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::max(x, y)).to_array(),
    ));
}

fn max_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::max(x, y)).to_array(),
    ));
}

fn max_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::max(x, y)).to_array(),
    ));
}

fn max_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::max(x, y)).to_array(),
    ));
}

fn max_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::max(x, y)).to_array(),
    ));
}

fn max_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::max(x, y)).to_array(),
    ));
}

fn max_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::max(x, y)).to_array(),
    ));
}

fn max_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::max(x, y)).to_array(),
    ));
}

fn max_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::max(x, y)).to_array(),
    ));
}

fn max_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::max(x, y)).to_array(),
    ));
}

fn max_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::max(x, y)).to_array(),
    ));
}

fn max_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::max(x, y)).to_array(),
    ));
}

fn max_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::max(x, y)).to_array(),
    ));
}

fn max_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::max(x, y)).to_array(),
    ));
}

fn max_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::max(x, y)).to_array(),
    ));
}

fn max_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::max(x, y)).to_array(),
    ));
}

fn max_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::max(x, y)).to_array(),
    ));
}

fn max_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::max(x, y)).to_array(),
    ));
}

fn max_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::max(x, y)).to_array(),
    ));
}

fn max_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::max(x, y)).to_array(),
    ));
}

fn max_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::max(x, y)).to_array(),
    ));
}

fn max_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::max(x, y)).to_array(),
    ));
}

fn max_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::max(x, y)).to_array(),
    ));
}

fn max_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::max(x, y)).to_array(),
    ));
}

fn max_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::max(x, y)).to_array(),
    ));
}

fn max_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::max(x, y)).to_array(),
    ));
}

fn max_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::max(x, y)).to_array(),
    ));
}

fn max_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::max(x, y)).to_array(),
    ));
}

fn max_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::max(x, y)).to_array(),
    ));
}

fn max_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::max(x, y)).to_array(),
    ));
}

fn max_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::max(x, y)).to_array(),
    ));
}

fn max_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::max(x, y)).to_array(),
    ));
}

fn max_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::max(x, y)).to_array(),
    ));
}

fn max_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::max(x, y)).to_array(),
    ));
}

fn max_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::max(x, y)).to_array(),
    ));
}

fn max_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::max(x, y)).to_array(),
    ));
}

fn max_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::max(x, y)).to_array(),
    ));
}

fn merge_bool_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_bool_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_bool_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_bool_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_bool_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f32_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f32_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f32_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f32_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f32_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f64_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f64_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f64_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f64_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_f64_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i16_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i16_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i16_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i16_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i16_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i32_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i32_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i32_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i32_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i32_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i64_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i64_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i64_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i64_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i64_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i8_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i8_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i8_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i8_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_i8_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u16_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u16_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u16_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u16_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u16_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u32_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u32_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u32_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u32_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u32_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u64_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u64_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u64_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u64_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u64_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u8_1(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let dst = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u8_2(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let dst = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u8_3(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let dst = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u8_4(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let dst = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn merge_u8_5(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let dst = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}

fn min_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::min(x, y)).to_array(),
    ));
}

fn min_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::min(x, y)).to_array(),
    ));
}

fn min_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::min(x, y)).to_array(),
    ));
}

fn min_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::min(x, y)).to_array(),
    ));
}

fn min_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f32::min(x, y)).to_array(),
    ));
}

fn min_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::min(x, y)).to_array(),
    ));
}

fn min_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::min(x, y)).to_array(),
    ));
}

fn min_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::min(x, y)).to_array(),
    ));
}

fn min_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::min(x, y)).to_array(),
    ));
}

fn min_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| f64::min(x, y)).to_array(),
    ));
}

fn min_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::min(x, y)).to_array(),
    ));
}

fn min_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::min(x, y)).to_array(),
    ));
}

fn min_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::min(x, y)).to_array(),
    ));
}

fn min_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::min(x, y)).to_array(),
    ));
}

fn min_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i16::min(x, y)).to_array(),
    ));
}

fn min_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::min(x, y)).to_array(),
    ));
}

fn min_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::min(x, y)).to_array(),
    ));
}

fn min_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::min(x, y)).to_array(),
    ));
}

fn min_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::min(x, y)).to_array(),
    ));
}

fn min_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i32::min(x, y)).to_array(),
    ));
}

fn min_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::min(x, y)).to_array(),
    ));
}

fn min_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::min(x, y)).to_array(),
    ));
}

fn min_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::min(x, y)).to_array(),
    ));
}

fn min_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::min(x, y)).to_array(),
    ));
}

fn min_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i64::min(x, y)).to_array(),
    ));
}

fn min_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::min(x, y)).to_array(),
    ));
}

fn min_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::min(x, y)).to_array(),
    ));
}

fn min_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::min(x, y)).to_array(),
    ));
}

fn min_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::min(x, y)).to_array(),
    ));
}

fn min_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| i8::min(x, y)).to_array(),
    ));
}

fn min_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::min(x, y)).to_array(),
    ));
}

fn min_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::min(x, y)).to_array(),
    ));
}

fn min_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::min(x, y)).to_array(),
    ));
}

fn min_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::min(x, y)).to_array(),
    ));
}

fn min_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u16::min(x, y)).to_array(),
    ));
}

fn min_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::min(x, y)).to_array(),
    ));
}

fn min_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::min(x, y)).to_array(),
    ));
}

fn min_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::min(x, y)).to_array(),
    ));
}

fn min_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::min(x, y)).to_array(),
    ));
}

fn min_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u32::min(x, y)).to_array(),
    ));
}

fn min_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::min(x, y)).to_array(),
    ));
}

fn min_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::min(x, y)).to_array(),
    ));
}

fn min_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::min(x, y)).to_array(),
    ));
}

fn min_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::min(x, y)).to_array(),
    ));
}

fn min_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u64::min(x, y)).to_array(),
    ));
}

fn min_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::min(x, y)).to_array(),
    ));
}

fn min_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::min(x, y)).to_array(),
    ));
}

fn min_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::min(x, y)).to_array(),
    ));
}

fn min_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::min(x, y)).to_array(),
    ));
}

fn min_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        l.zip(r).map(|(x, y)| u8::min(x, y)).to_array(),
    ));
}

fn mul_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn mul_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x * y).to_array()));
}

fn ne_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn ne_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x != y).to_array()));
}

fn neg_i16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_i8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u16_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u16_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u16_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u16_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u16_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u32_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u32_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u32_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u32_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u32_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u64_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u64_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u64_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u64_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u64_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u8_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u8_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u8_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u8_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn neg_u8_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn not_bool_1(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn not_bool_2(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn not_bool_3(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn not_bool_4(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn not_bool_5(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.map(|x| !x).to_array()));
}

fn or_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn or_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn or_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn or_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn or_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x | y).to_array()));
}

fn ref_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<bool, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<bool, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<bool, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<bool, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<bool, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f32, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f32, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f32, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f32, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f32, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f64, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f64, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f64, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f64, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<f64, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i16, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i16, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i16, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i16, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i16, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i32, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i32, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i32, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i32, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i32, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i64, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i64, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i64, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i64, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i64, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i8, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i8, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i8, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i8, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<i8, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u16, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u16, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u16, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u16, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u16, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u32, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u32, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u32, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u32, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u32, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u64, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u64, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u64, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u64, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u64, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u8, 1>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u8, 2>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u8, 3>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u8, 4>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn ref_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack
        .get(code.read_ref())
        .unwrap()
        .array_ref::<u8, 5>()
        .unwrap();
    stack.push(AnyArray::new(a.clone()));
}

fn rem_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn rem_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x % y).to_array()));
}

fn reshape_1_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_1_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<1>()).to_array(),
    ));
}

fn reshape_2_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_2_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<2>()).to_array(),
    ));
}

fn reshape_3_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_3_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<3>()).to_array(),
    ));
}

fn reshape_4_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_4_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<4>()).to_array(),
    ));
}

fn reshape_5_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn reshape_5_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.into_shape(code.read_shape::<5>()).to_array(),
    ));
}

fn shl_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shl_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x << y).to_array()));
}

fn shr_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn shr_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x >> y).to_array()));
}

fn slice_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn slice_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<1>()).to_array()));
}

fn slice_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<2>()).to_array()));
}

fn slice_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<3>()).to_array()));
}

fn slice_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<4>()).to_array()));
}

fn slice_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<5>()).to_array()));
}

fn step_bool_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_bool_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_bool_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_bool_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_bool_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_f32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_f32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_f32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_f32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_f32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_f64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_f64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_f64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_f64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_f64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_i16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_i16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_i16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_i16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_i16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_i32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_i32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_i32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_i32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_i32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_i64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_i64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_i64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_i64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_i64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_i8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_i8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_i8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_i8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_i8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_u16_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_u16_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_u16_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_u16_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_u16_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_u32_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_u32_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_u32_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_u32_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_u32_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_u64_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_u64_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_u64_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_u64_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_u64_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn step_u8_1(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<1>()).to_array(),
    ));
}

fn step_u8_2(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<2>()).to_array(),
    ));
}

fn step_u8_3(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<3>()).to_array(),
    ));
}

fn step_u8_4(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<4>()).to_array(),
    ));
}

fn step_u8_5(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(
        a.all().step(code.read_shape::<5>()).to_array(),
    ));
}

fn sub_f32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_f64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<f64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<f64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_i8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<i8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<i8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u16_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u16_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u16_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u16_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u16_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u16, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u16, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u32_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u32_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u32_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u32_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u32_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u32, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u32, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u64_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u64_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u64_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u64_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u64_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u64, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u64, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u8_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 1>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u8_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 2>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u8_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 3>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u8_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 4>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn sub_u8_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<u8, 5>().unwrap();
    let l = stack.pop().unwrap().array::<u8, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x - y).to_array()));
}

fn xor_bool_1(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 1>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 1>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn xor_bool_2(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 2>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 2>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn xor_bool_3(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 3>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 3>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn xor_bool_4(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 4>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 4>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}

fn xor_bool_5(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<bool, 5>().unwrap();
    let l = stack.pop().unwrap().array::<bool, 5>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x ^ y).to_array()));
}
