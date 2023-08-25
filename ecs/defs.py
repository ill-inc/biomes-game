from collections import OrderedDict

from ecs_ast import (ComponentVisibility, FieldDef, Generator, IndexType,
                     TypeGenerator)


def define_types(g: TypeGenerator):
    t = g.types

    # Define basic types
    g.add_type(
        "Strings",
        t.List(t.String()),
    )
    g.add_type(
        "BiomesIdList",
        t.List(t.BiomesId()),
    )

    g.add_type(
        "BiomesIdSet",
        t.Set(t.BiomesId()),
    )

    # Define vector types
    g.add_type(
        "Vec2i",
        t.Tuple(t.I32(), t.I32()),
    )
    g.add_type(
        "Vec3i",
        t.Tuple(t.I32(), t.I32(), t.I32()),
    )
    g.add_type(
        "Vec4i",
        t.Tuple(t.I32(), t.I32(), t.I32(), t.I32()),
    )
    g.add_type(
        "Vec2f",
        t.Tuple(t.F64(), t.F64()),
    )
    g.add_type(
        "Vec3f",
        t.Tuple(t.F64(), t.F64(), t.F64()),
    )
    g.add_type(
        "Vec4f",
        t.Tuple(t.F64(), t.F64(), t.F64(), t.F64()),
    )
    g.add_type(
        "Mat3f",
        t.Tuple(
            t.F64(),
            t.F64(),
            t.F64(),
            t.F64(),
            t.F64(),
            t.F64(),
            t.F64(),
            t.F64(),
            t.F64(),
        ),
    )
    g.add_type(
        "OptionalMat3f",
        t.Optional(t.Mat3f()),
    )
    g.add_type(
        "Vec3iList",
        t.List(t.Tuple(t.I32(), t.I32(), t.I32())),
    )
    g.add_type(
        "Box2",
        t.Dict(
            v0=t.Vec3f(),
            v1=t.Vec3f(),
        ),
    )

    g.add_type(
        "OptionalVec3f",
        t.Optional(t.Vec3f()),
    )

    g.add_type(
        "Vec3fList",
        t.List(t.Vec3f()),
    )

    g.add_type(
        "OptionalVec2f",
        t.Optional(t.Vec2f()),
    )

    g.add_type("OptionalBool", t.Optional(t.Bool()))

    g.add_type("OptionalI32", t.Optional(t.I32()))
    g.add_type("OptionalU32", t.Optional(t.U32()))
    g.add_type("OptionalI64", t.Optional(t.I64()))
    g.add_type("OptionalU64", t.Optional(t.U64()))
    g.add_type("OptionalF64", t.Optional(t.F64()))

    g.add_type("OptionalBiomesId", t.Optional(t.BiomesId()))

    # Define tensor data types
    g.add_type(
        "TensorBlob",
        t.String(),
    )
    g.add_type("OptionalTensorBlob", t.Optional(t.TensorBlob()))

    # Define gaia growth and decay types
    g.add_type(
        "TerrainUpdate",
        t.Tuple(t.Vec3i(), t.U32()),
    )
    g.add_type(
        "TerrainUpdateList",
        t.List(t.TerrainUpdate()),
    )

    # Define inventory types
    g.add_type(
        "Appearance",
        t.Dict(
            # Refers to IDs defined in src/shared/asset_defs/gen/character_appearance.ts.
            skin_color_id=t.String(),
            eye_color_id=t.String(),
            hair_color_id=t.String(),
            head_id=t.BiomesId(),  # Refers to a "head" wearable.
        ),
    )

    g.add_type(
        "ItemSlot",
        t.Optional(t.ItemAndCount()),
    )

    g.add_type(
        "PricedItemSlot",
        t.Optional(
            t.Dict(
                contents=t.ItemAndCount(),
                price=t.ItemAndCount(),
                seller_id=t.BiomesId(),
            )
        ),
    )

    g.add_type(
        "ItemContainer",
        t.List(t.ItemSlot()),
    )

    g.add_type(
        "PricedItemContainer",
        t.List(t.PricedItemSlot()),
    )

    g.add_type("OptionalItem", t.Optional(t.Item()))
    g.add_type("OptionalItemAndCount", t.Optional(t.ItemAndCount()))
    g.add_type("ItemSet", t.Map(t.String(), t.Item()))

    g.add_type("ItemBag", t.Map(t.String(), t.ItemAndCount()))
    g.add_type("OptionalItemBag", t.Optional(t.ItemBag()))

    g.add_type("ItemAssignment", t.Map(t.BiomesId(), t.Item()))

    g.add_type(
        "ItemAssignmentReference",
        t.Dict(
            key=t.BiomesId(),
        ),
    )
    g.add_type(
        "ItemContainerReference",
        t.Dict(
            idx=t.U16(),
        ),
    )
    g.add_type(
        "ItemBagReference",
        t.Dict(
            key=t.String(),
        ),
    )

    g.add_type(
        "OwnedItemReference",
        t.OneOf(
            item=t.ItemContainerReference(),
            hotbar=t.ItemContainerReference(),
            currency=t.ItemBagReference(),
            wearable=t.ItemAssignmentReference(),
        ),
    )

    g.add_type(
        "OptionalOwnedItemReference",
        t.Optional(t.OwnedItemReference()),
    )

    g.add_type("OwnedItemReferenceList", t.List(t.OwnedItemReference()))

    g.add_type(
        "InventoryAssignmentPattern",
        t.List(t.Tuple(t.OwnedItemReference(), t.ItemAndCount())),
    )

    g.add_type(
        "OptionalInventoryAssignmentPattern",
        t.Optional(t.List(t.Tuple(t.OwnedItemReference(), t.ItemAndCount()))),
    )

    g.add_type(
        "ConsumptionAction",
        t.Enum(
            [
                "drink",
                "eat",
            ]
        ),
    )

    g.add_type(
        "EmoteType",
        t.Enum(
            [
                "attack1",
                "attack2",
                "destroy",
                "place",
                "applause",
                "dance",
                "drink",
                "eat",
                "flex",
                "laugh",
                "point",
                "rock",
                "sick",
                "sit",
                "splash",
                "warp",
                "warpHome",
                "wave",
                "fishingCastPull",
                "fishingCastRelease",
                "fishingIdle",
                "fishingReel",
                "fishingShow",
                "diggingHand",
                "diggingTool",
                "watering",
                "equip",
                "unequip",
            ]
        ),
    )

    # Fishing Emote Stuff
    g.add_type(
        "EmoteFishingLinePhysicsPosition",
        t.Dict(velocity=t.Vec3f(), gravity=t.Vec3f(), start=t.Vec3f()),
    )

    g.add_type(
        "EmoteFishingLineReelInPosition",
        t.Dict(
            start=t.Vec3f(),
            duration=t.F64(),
        ),
    )

    g.add_type(
        "EmoteFishingLineFixedPosition",
        t.Dict(
            pos=t.Vec3f(),
        ),
    )

    g.add_type(
        "EmoteFishingLineEndPosition",
        t.OneOf(
            physics=t.EmoteFishingLinePhysicsPosition(),
            reel_in=t.EmoteFishingLineReelInPosition(),
            fixed=t.EmoteFishingLineFixedPosition(),
        ),
    )

    g.add_type(
        "EmoteFishingInfo",
        t.Dict(
            line_end_position=t.Optional(t.EmoteFishingLineEndPosition()),
            line_end_item=t.OptionalItem(),
        ),
    )

    g.add_type(
        "OptionalEmoteFishingInfo",
        t.Optional(t.EmoteFishingInfo()),
    )

    g.add_type(
        "EmoteThrowInfo",
        t.Dict(
            physics=t.EmoteFishingLinePhysicsPosition(),
            angular_velocity=t.OptionalVec2f(),
        ),
    )

    g.add_type(
        "OptionalEmoteThrowInfo",
        t.Optional(t.Optional(t.EmoteThrowInfo())),
    )

    g.add_type(
        "RichEmoteComponents",
        t.Dict(
            fishing_info=t.OptionalEmoteFishingInfo(),
            throw_info=t.OptionalEmoteThrowInfo(),
            item_override=t.OptionalItem(),
        ),
    )

    g.add_type(
        "OptionalRichEmoteComponents",
        t.Optional(t.RichEmoteComponents()),
    )

    g.add_type(
        "WarpHomeReason",
        t.Enum(["respawn", "homestone", "admin"]),
    )

    g.add_type("OptionalEmoteType", t.Optional(t.EmoteType()))

    g.add_type(
        "CameraMode",
        t.Enum(
            [
                "normal",
                "selfie",
                "fps",
                "isometric",
                "iso_ne",
                "iso_nw",
                "iso_sw",
                "iso_se",  # Deprecated
            ]
        ),
    )

    g.add_type(
        "WarpTarget",
        t.Dict(
            warp_to=t.Vec3f(),
            orientation=t.Vec2f(),
        ),
    )
    g.add_type("OptionalWarpTarget", t.Optional(t.WarpTarget()))

    g.add_type("OptionalShardId", t.Optional(t.ShardId()))

    g.add_type("OptionalString", t.Optional(t.String()))
    g.add_type("OptionalBuffer", t.Optional(t.Buffer()))

    g.add_type(
        "EntitiesAndExpiry",
        t.Dict(entity_ids=t.Set(t.BiomesId()), expiry=t.Optional(t.F64())),
    )
    g.add_type(
        "GrabBagFilter",
        t.OneOf(
            block=t.EntitiesAndExpiry(),
            only=t.EntitiesAndExpiry(),
        ),
    )

    g.add_type(
        "NUXStatus",
        t.Dict(
            complete=t.Bool(),
            state_id=t.String(),
        ),
    )

    g.add_type("AllNUXStatus", t.Map(t.I32(), t.NUXStatus()))

    g.add_type(
        "AclAction",
        t.Enum(
            [
                "shape",
                "place",
                "destroy",
                "interact",
                "administrate",
                "createGroup",
                "dump",
                "placeCampsite",
                "tillSoil",
                "plantSeed",
                "pvp",
                "warp_from",
                "apply_buffs",
                "placeRobot",
                "placeEphemeral",
                "demuckerWand",
            ]
        ),
    )

    g.add_type(
        "UserRole",
        t.Enum(
            [
                "employee",
                "admin",
                "advancedOptions",
                "deleteGroup",
                "highlightGroup",
                "unplaceGroup",
                "repairGroup",
                "seeGremlins",
                "seeNpcs",
                "bless",
                "give",
                "flying",
                "internalSync",
                "export",
                "groundskeeper",
                "clone",
                "apply",
                "twoWayInbox",
                "baker",
                "farmingAdmin",
                "oobNoCors",
                "noClip",
            ]
        ),
    )

    g.add_type("UserRoleSet", t.Set(t.UserRole()))

    g.add_type(
        "TargetedAcl", t.Optional(t.Tuple(t.BiomesId(), t.Set(t.AclAction())))
    )

    g.add_type(
        "Acl",
        t.Dict(
            everyone=t.Set(t.AclAction()),
            roles=t.Map(t.UserRole(), t.Set(t.AclAction())),
            entities=t.Map(t.BiomesId(), t.Set(t.AclAction())),
            teams=t.Map(t.BiomesId(), t.Set(t.AclAction())),
            # These are normalized ACLs in that they represent a particular entity
            # or team - but this denormalized value may lag the truth. For example,
            # if you change the creator of an entity the 'creator' ACL here may refer
            # to the former creator for some (short) period of time before being
            # updated.
            creator=t.TargetedAcl(),
            creatorTeam=t.TargetedAcl(),
        ),
    )

    g.add_type("Aabb", t.Tuple(t.Vec3f(), t.Vec3f()))
    g.add_type("OptionalAabb", t.Optional(t.Aabb()))

    g.add_type(
        "AclDomain",
        t.OneOf(
            aabb=t.Dict(kind=t.Enum(["aabb"]), aabb=t.Aabb()),
            point=t.Dict(kind=t.Enum(["point"]), point=t.Vec3f()),
            points=t.Dict(kind=t.Enum(["points"]), points=t.Vec3fList()),
        ),
    )

    g.add_type(
        "NpcDamageSource",
        t.OneOf(
            dayNight=t.Dict(kind=t.Enum(["dayNight"])),
            farFromHome=t.Dict(kind=t.Enum(["farFromHome"])),
            adminKill=t.Dict(kind=t.Enum(["adminKill"])),
            outOfWorldBounds=t.Dict(kind=t.Enum(["outOfWorldBounds"])),
        ),
    )
    g.add_type(
        "DamageSource",
        t.OneOf(
            suicide=t.Dict(kind=t.Enum(["suicide"])),
            despawnWand=t.Dict(kind=t.Enum(["despawnWand"])),
            block=t.Dict(kind=t.Enum(["block"]), biscuitId=t.BiomesId()),
            fall=t.Dict(kind=t.Enum(["fall"]), distance=t.F64()),
            attack=t.Dict(
                kind=t.Enum(["attack"]),
                attacker=t.BiomesId(),
                dir=t.OptionalVec3f(),
            ),
            drown=t.Dict(kind=t.Enum(["drown"])),
            fire=t.Dict(kind=t.Enum(["fire"])),  # deprecated
            fireDamage=t.Dict(kind=t.Enum(["fireDamage"])),
            fireHeal=t.Dict(kind=t.Enum(["fireHeal"])),
            heal=t.Dict(kind=t.Enum(["heal"])),
            # Covers all NPC-specific related death types. Should never be a
            # player's death reason.
            npc=t.Dict(kind=t.Enum(["npc"]), type=t.NpcDamageSource()),
        ),
    )
    g.add_type("OptionalDamageSource", t.Optional(t.DamageSource()))

    g.add_type(
        "PlaceableAnimationType",
        t.Enum(["open", "close", "play"]),
    )

    g.add_type("AnimationRepeatKind", t.Enum(["once", "repeat"]))

    g.add_type(
        "OptionalAnimationRepeatKind", t.Optional(t.AnimationRepeatKind())
    )

    g.add_type(
        "PlaceableAnimation",
        t.Dict(
            type=t.PlaceableAnimationType(),
            repeat=t.OptionalAnimationRepeatKind(),
            start_time=t.F64(),
        ),
    )
    g.add_type("OptionalPlaceableAnimation", t.Optional(t.PlaceableAnimation()))

    g.add_type(
        "ChallengeState",
        t.Enum(["available", "completed", "in_progress", "start"]),
    )

    g.add_type(
        "ChallengeStateMap",
        t.Map(t.BiomesId(), t.ChallengeState()),
    )

    g.add_type(
        "LifetimeStatsType",
        t.Enum(
            [
                "collected",
                "crafted",
                "fished",
                "mined",
                "consumed",
                "grown",
                "takenPhoto",
            ]
        ),
    )
    g.add_type("LifetimeStatsMap", t.Map(t.LifetimeStatsType(), t.ItemBag()))

    g.add_type("TriggerTrees", t.Map(t.BiomesId(), t.TriggerStateMap()))

    g.add_type("PositionBeamMap", t.Map(t.BiomesId(), t.Vec2f()))

    g.add_type("PlaceEventInfo", t.Dict(time=t.F64(), position=t.Vec3i()))
    g.add_type("OptionalPlaceEventInfo", t.Optional(t.PlaceEventInfo()))

    g.add_type("ChallengeTime", t.Map(t.BiomesId(), t.F64()))

    g.add_type(
        "Buff",
        t.Dict(
            item_id=t.BiomesId(),
            start_time=t.Optional(t.F64()),
            from_id=t.OptionalBiomesId(),
            is_disabled=t.OptionalBool(),
        ),
    )
    g.add_type(
        "BuffsList",
        t.List(t.Buff()),
    )

    g.add_type(
        "PlantStatus",
        t.Enum(
            [
                "planted",
                "growing",
                "fully_grown",
                "dead",
                "halted_sun",
                "halted_shade",
                "halted_water",
            ]
        ),
    )

    g.add_type(
        "MinigameType",
        t.Enum(["simple_race", "deathmatch", "spleef"]),
    )

    g.add_type(
        "TagRoundState",
        t.Dict(
            it_player=t.BiomesId(),
        ),
    )
    g.add_type("OptionalTagRoundState", t.Optional(t.TagRoundState()))

    g.add_type(
        "MinigameMetadata",
        t.OneOf(
            simple_race=t.Dict(
                checkpoint_ids=t.BiomesIdSet(),
                start_ids=t.BiomesIdSet(),
                end_ids=t.BiomesIdSet(),
            ),
            deathmatch=t.Dict(
                start_ids=t.BiomesIdSet(),
            ),
            spleef=t.Dict(
                start_ids=t.BiomesIdSet(),
                arena_marker_ids=t.BiomesIdSet(),
            ),
        ),
    )

    g.add_type(
        "DeathMatchPlayerState",
        t.Dict(
            playerId=t.BiomesId(),
            kills=t.I32(),
            deaths=t.I32(),
            last_kill=t.OptionalF64(),
            last_death=t.OptionalF64(),
        ),
    )

    g.add_type(
        "DeathmatchInstanceState",
        t.Dict(
            instance_state=t.Optional(
                t.OneOf(
                    waiting_for_players=t.Dict(),
                    play_countdown=t.Dict(
                        round_start=t.F64(),
                    ),
                    playing=t.Dict(
                        round_end=t.F64(),
                    ),
                    finished=t.Dict(
                        timestamp=t.F64(),
                    ),
                )
            ),
            player_states=t.Map(t.BiomesId(), t.DeathMatchPlayerState()),
        ),
    )

    g.add_type(
        "SpleefPlayerStats",
        t.Dict(
            playerId=t.BiomesId(),
            rounds_won=t.I32(),
        ),
    )

    g.add_type(
        "SpleefInstanceState",
        t.Dict(
            instance_state=t.OneOf(
                waiting_for_players=t.Dict(),
                round_countdown=t.Dict(
                    round_start=t.F64(),
                    last_winner_id=t.OptionalBiomesId(),
                ),
                playing_round=t.Dict(
                    round_expires=t.F64(),
                    alive_round_players=t.BiomesIdSet(),
                    tag_round_state=t.OptionalTagRoundState(),
                ),
            ),
            observer_spawn_points=t.Vec3fList(),
            player_stats=t.Map(t.BiomesId(), t.SpleefPlayerStats()),
            round_number=t.I32(),
        ),
    )

    g.add_type("ReachedCheckpoints", t.Map(t.BiomesId(), t.Dict(time=t.F64()))),
    g.add_type(
        "SimpleRaceInstanceState",
        t.Dict(
            player_state=t.Enum(["waiting", "racing"]),
            started_at=t.F64(),
            deaths=t.I32(),
            reached_checkpoints=t.ReachedCheckpoints(),
            finished_at=t.OptionalF64(),
        ),
    )

    g.add_type(
        "MinigameInstanceState",
        t.OneOf(
            simple_race=t.SimpleRaceInstanceState(),
            deathmatch=t.DeathmatchInstanceState(),
            spleef=t.SpleefInstanceState(),
        ),
    )

    g.add_type(
        "MinigameInstanceActivePlayerInfo",
        t.Dict(
            entry_stash_id=t.BiomesId(),
            entry_position=t.Vec3f(),
            entry_warped_to=t.OptionalVec3f(),
            entry_time=t.F64(),
        ),
    )

    g.add_type(
        "MinigameInstanceActivePlayerMap",
        t.Map(t.BiomesId(), t.MinigameInstanceActivePlayerInfo()),
    )

    g.add_type(
        "GiveMinigameKitData",
        t.OneOf(simple_race=t.Dict(), deathmatch=t.Dict(), spleef=t.Dict()),
    )

    g.add_type(
        "MinigameInstanceSpaceClipboardInfo",
        t.Dict(
            region=t.OneOf(
                aabb=t.Dict(
                    box=t.Box2(),
                    clipboard_entity_id=t.BiomesId(),
                )
            )
        ),
    )
    g.add_type(
        "OptionalMinigameInstanceSpaceClipboardInfo",
        t.Optional(t.MinigameInstanceSpaceClipboardInfo()),
    )

    g.add_type(
        "FarmingPlayerAction",
        t.OneOf(
            water=t.Dict(
                kind=t.Enum(["water"]),
                amount=t.F32(),
                timestamp=t.F64(),
            ),
            fertilize=t.Dict(
                kind=t.Enum(["fertilize"]),
                fertilizer=t.Item(),
                timestamp=t.F64(),
            ),
            adminDestroy=t.Dict(
                kind=t.Enum(["adminDestroy"]),
                timestamp=t.F64(),
            ),
            poke=t.Dict(
                kind=t.Enum(["poke"]),
                timestamp=t.F64(),
            ),
        ),
    )

    g.add_type(
        "FarmingPlayerActionList",
        t.List(t.FarmingPlayerAction()),
    )

    g.add_type(
        "ItemBuyerSpec",
        t.OneOf(
            item_types=t.Dict(
                type_ids=t.BiomesIdList(),
            ),
        ),
    )

    g.add_type(
        "BucketedImageCloudBundle",
        t.Dict(
            webp_320w=t.OptionalString(),
            webp_640w=t.OptionalString(),
            webp_1280w=t.OptionalString(),
            png_1280w=t.OptionalString(),
            webp_original=t.OptionalString(),
            bucket=t.Enum(["biomes-social"]),
        ),
    )

    g.add_type(
        "ProtectionParams",
        t.Dict(
            acl=t.Acl(),
        ),
    )
    g.add_type("OptionalProtectionParams", t.Optional(t.ProtectionParams()))

    g.add_type(
        "RestorationParams",
        t.Dict(
            acl=t.Acl(),
            restore_delay_s=t.F64(),
        ),
    )
    g.add_type("OptionalRestorationParams", t.Optional(t.RestorationParams()))

    g.add_type(
        "TerrainRestorationEntry",
        t.Dict(
            # The flattened position key, derived from the voxel's (x,y,z).
            position_index=t.U16(),
            created_at=t.F64(),
            restore_time=t.F64(),
            terrain=t.OptionalF64(),
            placer=t.OptionalF64(),
            dye=t.OptionalF64(),
            shape=t.OptionalF64(),
        ),
    )
    g.add_type(
        "TerrainRestorationEntryList", t.List(t.TerrainRestorationEntry())
    )

    g.add_type(
        "TeamMemberMetadata",
        t.Dict(
            joined_at=t.F64(),
        ),
    )

    g.add_type(
        "TeamInvite",
        t.Dict(
            inviter_id=t.BiomesId(), invitee_id=t.BiomesId(), created_at=t.F64()
        ),
    )

    g.add_type(
        "TeamJoinRequest", t.Dict(entity_id=t.BiomesId(), created_at=t.F64())
    )

    g.add_type("TeamPendingInvites", t.Map(t.BiomesId(), t.TeamInvite()))
    g.add_type("TeamPendingRequests", t.List(t.TeamJoinRequest()))

    g.add_type(
        "TeamMembers",
        t.Map(t.BiomesId(), t.TeamMemberMetadata()),
    )

    g.add_type(
        "Volume",
        t.OneOf(
            box=t.Dict(
                kind=t.Enum(["box"]),
                box=t.Vec3f(),
            ),
            sphere=t.Dict(
                kind=t.Enum(["sphere"]),
                radius=t.F64(),
            ),
        ),
    )
    g.add_type("OptionalVolume", t.Optional(t.Volume()))

    g.add_type("EntityRestoreToState", t.Enum(["created", "deleted"]))

    g.add_type(
        "TradeSpec",
        t.Dict(trade_id=t.BiomesId(), id1=t.BiomesId(), id2=t.BiomesId()),
    )
    g.add_type("TradeSpecList", t.List(t.TradeSpec()))

    g.add_type(
        "Trader",
        t.Dict(
            id=t.BiomesId(),
            offer_assignment=t.InventoryAssignmentPattern(),
            accepted=t.Bool(),
        ),
    )

    return g.build()


def define_components(g: Generator):
    s = g.symbols

    g.mark_deprecated_component(114)
    g.mark_deprecated_component(116)
    g.mark_deprecated_component(36)
    g.mark_deprecated_component(44)
    g.mark_deprecated_component(62)
    g.mark_deprecated_component(69)
    g.mark_deprecated_component(73)
    g.mark_deprecated_component(81)
    g.mark_deprecated_component(85)
    g.mark_deprecated_component(89)
    g.mark_deprecated_component(90)
    g.mark_deprecated_component(94)
    g.mark_deprecated_component(96)
    g.mark_deprecated_component(42)

    g.add_component(
        id=57,
        name="Iced",
        visibility=ComponentVisibility.EVERYONE,
        fields={},
    )

    g.add_component(
        id=31,
        name="RemoteConnection",
        visibility=ComponentVisibility.EVERYONE,
        fields={},
    )

    g.add_component(
        id=54,
        name="Position",
        visibility=ComponentVisibility.EVERYONE,
        fields={1: FieldDef(name="v", kind=s.Vec3f)},
        hfc=True,
    )

    g.add_component(
        id=55,
        name="Orientation",
        visibility=ComponentVisibility.EVERYONE,
        fields={1: FieldDef(name="v", kind=s.Vec2f)},
        hfc=True,
    )

    g.add_component(
        id=32,
        name="RigidBody",
        visibility=ComponentVisibility.EVERYONE,
        fields={3: FieldDef(name="velocity", kind=s.Vec3f)},
        hfc=True,
    )

    g.add_component(
        id=110,
        name="Size",
        visibility=ComponentVisibility.EVERYONE,
        fields={3: FieldDef(name="v", kind=s.Vec3f)},
    )

    g.add_component(
        id=33,
        name="Box",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="v0", kind=s.Vec3i),
            2: FieldDef(name="v1", kind=s.Vec3i),
        },
    )

    g.add_component(
        id=34,
        name="ShardSeed",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            3: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=35,
        name="ShardDiff",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            4: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=60,
        name="ShardShapes",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            3: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=76,
        name="ShardSkyOcclusion",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            3: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=80,
        name="ShardIrradiance",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            3: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=82,
        name="ShardWater",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            3: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=93,
        name="ShardOccupancy",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            3: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=111,
        name="ShardDye",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=112,
        name="ShardMoisture",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=113,
        name="ShardGrowth",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=120,
        name="ShardPlacer",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            3: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=124,
        name="ShardMuck",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=37,
        name="Label",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="text", kind=s.String),
        },
    )

    g.add_component(
        id=51,
        name="GrabBag",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="slots", kind=s.ItemBag),
            3: FieldDef(name="filter", kind=s.GrabBagFilter),
            4: FieldDef(name="mined", kind=s.Bool),
        },
    )

    g.add_component(
        id=52,
        name="Acquisition",
        # acquired_by should be EVERYONE, but maybe items should be SELF?
        # we want to distinguish between inventory changes and acquisition events
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="acquired_by", kind=s.BiomesId),
            3: FieldDef(name="items", kind=s.ItemBag),
        },
    )

    g.add_component(
        id=53,
        name="LooseItem",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="item", kind=s.Item),
        },
    )

    g.add_component(
        id=41,
        name="Inventory",
        visibility=ComponentVisibility.SELF,
        fields={
            6: FieldDef(name="items", kind=s.ItemContainer),
            7: FieldDef(name="currencies", kind=s.ItemBag),
            8: FieldDef(name="hotbar", kind=s.ItemContainer),
            9: FieldDef(name="selected", kind=s.OwnedItemReference),
            10: FieldDef(name="overflow", kind=s.ItemBag),
        },
    )

    g.add_component(
        id=79,
        name="ContainerInventory",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="items", kind=s.ItemContainer),
        },
    )

    g.add_component(
        id=86,
        name="PricedContainerInventory",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="items", kind=s.PricedItemContainer),
            2: FieldDef(name="infinite_capacity", kind=s.Bool),
        },
    )

    g.add_component(
        id=59,
        name="SelectedItem",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="item", kind=s.ItemSlot),
        },
    )

    g.add_component(
        id=49,
        name="Wearing",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            2: FieldDef(name="items", kind=s.ItemAssignment),
        },
    )

    g.add_component(
        id=43,
        name="Emote",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="emote_type", kind=s.OptionalEmoteType),
            2: FieldDef(name="emote_start_time", kind=s.F64),
            3: FieldDef(name="emote_expiry_time", kind=s.F64),
            5: FieldDef(
                name="rich_emote_components", kind=s.OptionalRichEmoteComponents
            ),
            6: FieldDef(name="emote_nonce", kind=s.OptionalF64),
        },
        hfc=True,
    )

    g.add_component(
        id=56,
        name="AppearanceComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="appearance", kind=s.Appearance),
        },
    )

    g.add_component(
        id=45,
        name="GroupComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            6: FieldDef(name="tensor", kind=s.TensorBlob),
        },
    )

    g.add_component(
        id=46,
        name="Challenges",
        visibility=ComponentVisibility.SELF,
        fields={
            7: FieldDef(name="in_progress", kind=s.BiomesIdSet),
            8: FieldDef(name="complete", kind=s.BiomesIdSet),
            9: FieldDef(name="available", kind=s.BiomesIdSet),
            10: FieldDef(name="started_at", kind=s.ChallengeTime),
            11: FieldDef(name="finished_at", kind=s.ChallengeTime),
        },
    )

    g.add_component(
        id=48,
        name="RecipeBook",
        visibility=ComponentVisibility.SELF,
        fields={
            4: FieldDef(name="recipes", kind=s.ItemSet),
        },
    )

    g.add_component(
        id=50,
        name="Expires",
        visibility=ComponentVisibility.SERVER,
        fields={
            1: FieldDef(name="trigger_at", kind=s.F64),
        },
    )

    g.add_component(
        id=58,
        name="Icing",
        visibility=ComponentVisibility.SERVER,
        fields={
            1: FieldDef(name="trigger_at", kind=s.F64),
        },
    )

    g.add_component(
        id=61,
        name="Warpable",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            2: FieldDef(name="trigger_at", kind=s.F64),
            3: FieldDef(name="warp_to", kind=s.Vec3f),
            4: FieldDef(name="orientation", kind=s.Vec2f),
            # For royalty computation.
            5: FieldDef(name="owner", kind=s.BiomesId),
        },
    )

    g.add_component(
        id=63,
        name="PlayerStatus",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="init", kind=s.Bool),
            9: FieldDef(name="nux_status", kind=s.AllNUXStatus),
        },
    )

    g.add_component(
        id=64,
        name="PlayerBehavior",
        visibility=ComponentVisibility.EVERYONE,
        # TODO: Maybe we can pull emotes into here?
        # TODO: This would make a good home for advertising tool animations.
        fields={
            1: FieldDef(name="camera_mode", kind=s.CameraMode),
            2: FieldDef(name="place_event_info", kind=s.OptionalPlaceEventInfo),
        },
    )

    g.add_component(
        id=65,
        name="WorldMetadata",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="aabb", kind=s.Box2),
        },
    )

    # Npc data that changes infrequently or not at all.
    g.add_component(
        id=66,
        name="NpcMetadata",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="type_id", kind=s.BiomesId),
            # The time since epoch that this NPC was created at.
            3: FieldDef(name="created_time", kind=s.F64),
            # Information about the spawn event that created this NPC. It may
            # make sense to split this off into its own entity at some point.
            4: FieldDef(name="spawn_event_type_id", kind=s.OptionalBiomesId),
            5: FieldDef(name="spawn_event_id", kind=s.OptionalBiomesId),
            # Where was this NPC spawned?
            # Used to allow servers to determine Npc ownership from terrain
            # ownership.
            6: FieldDef(name="spawn_position", kind=s.Vec3f),
            # Orientation the NPC was spawned with, useful if we
            # need to reset them to their starting state.
            7: FieldDef(name="spawn_orientation", kind=s.Vec2f),
        },
    )

    # Stored as a component separate from Npc because it is expected to change
    # very frequently.
    g.add_component(
        id=67,
        name="NpcState",
        visibility=ComponentVisibility.SERVER,
        fields={
            # NPC state data is stored as a blob in the data field, and is
            # unique for each NPC type. Of course an NPC's full state also
            # includes the state of its other ECS components such as position,
            # this is specifically for custom NPC state data.
            2: FieldDef(name="data", kind=s.Buffer)
        },
        hfc=True,
    )

    g.add_component(
        id=68,
        name="GroupPreviewReference",
        visibility=ComponentVisibility.EVERYONE,
        fields={1: FieldDef(name="ref", kind=s.OptionalBiomesId)},
    )

    g.add_component(
        id=70,
        name="AclComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="acl", kind=s.Acl),
        },
    )

    g.add_component(
        id=71,
        name="DeedComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="owner", kind=s.BiomesId),
            2: FieldDef(name="description", kind=s.String),
            3: FieldDef(name="plots", kind=s.BiomesIdList),
            4: FieldDef(name="custom_owner_name", kind=s.OptionalString),
            5: FieldDef(name="map_display_size", kind=s.OptionalU32),
        },
    )

    g.add_component(
        id=72,
        name="GroupPreviewComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="owner_id", kind=s.BiomesId),
            2: FieldDef(name="blueprint_id", kind=s.OptionalBiomesId),
        },
    )

    g.add_component(
        id=87,
        name="BlueprintComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="owner_id", kind=s.BiomesId),
            2: FieldDef(name="blueprint_id", kind=s.BiomesId),
        },
    )

    g.add_component(
        id=74,
        name="CraftingStationComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={},
    )

    g.add_component(
        id=75,
        name="Health",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="hp", kind=s.I32),
            2: FieldDef(name="maxHp", kind=s.I32),
            3: FieldDef(name="lastDamageSource", kind=s.OptionalDamageSource),
            4: FieldDef(name="lastDamageTime", kind=s.OptionalF64),
            5: FieldDef(
                name="lastDamageInventoryConsequence", kind=s.OptionalItemBag
            ),
            6: FieldDef(
                name="lastDamageAmount",
                kind=s.OptionalI32,
            ),
        },
    )

    g.add_component(
        id=101,
        name="BuffsComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="buffs", kind=s.BuffsList),
            2: FieldDef(name="trigger_at", kind=s.OptionalF64),
        },
    )

    g.add_component(
        id=77,
        name="Gremlin",
        visibility=ComponentVisibility.EVERYONE,
        fields={},
    )

    g.add_component(
        id=78,
        name="PlaceableComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            # Deprecated 1
            2: FieldDef(name="item_id", kind=s.BiomesId),
            3: FieldDef(name="animation", kind=s.OptionalPlaceableAnimation),
            # Deprecated 4
        },
    )

    g.add_component(
        id=83,
        name="GroupedEntities",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="ids", kind=s.BiomesIdList),
        },
    )

    g.add_component(
        id=95,
        name="InGroup",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="id", kind=s.BiomesId),
        },
    )

    g.add_component(
        id=84,
        name="PictureFrameContents",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="placer_id", kind=s.BiomesId),
            2: FieldDef(name="photo_id", kind=s.OptionalBiomesId),
            4: FieldDef(name="minigame_id", kind=s.OptionalBiomesId),
        },
    )

    g.add_component(
        id=88,
        name="TriggerState",
        visibility=ComponentVisibility.SELF,
        fields={3: FieldDef(name="by_root", kind=s.TriggerTrees)},
    )

    g.add_component(
        id=91,
        name="LifetimeStats",
        visibility=ComponentVisibility.SELF,
        fields={
            # n.b. 1 and 2 are removed
            3: FieldDef(name="stats", kind=s.LifetimeStatsMap),
        },
    )

    g.add_component(
        id=97,
        name="OccupancyComponent",
        visibility=ComponentVisibility.SERVER,
        fields={
            3: FieldDef(name="buffer", kind=s.OptionalBuffer),
        },
    )

    g.add_component(
        id=92,
        name="VideoComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="video_url", kind=s.OptionalString),
            2: FieldDef(name="video_start_time", kind=s.OptionalF64),
            3: FieldDef(name="muted", kind=s.OptionalBool),
        },
    )

    g.add_component(
        id=98,
        name="PlayerSession",
        visibility=ComponentVisibility.SELF,
        fields={
            1: FieldDef(name="id", kind=s.String),
        },
    )

    g.add_component(
        id=99,
        name="PresetApplied",
        visibility=ComponentVisibility.SELF,
        fields={
            1: FieldDef(name="preset_id", kind=s.BiomesId),
            2: FieldDef(name="applier_id", kind=s.BiomesId),
            3: FieldDef(name="applied_at", kind=s.F64),
        },
    )

    g.add_component(
        id=100,
        name="PresetPrototype",
        visibility=ComponentVisibility.SELF,
        fields={
            1: FieldDef(name="last_updated", kind=s.F64),
            2: FieldDef(name="last_updated_by", kind=s.BiomesId),
        },
    )

    g.add_component(
        id=102,
        name="FarmingPlantComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="planter", kind=s.BiomesId),
            2: FieldDef(name="seed", kind=s.BiomesId),
            3: FieldDef(name="plant_time", kind=s.F64),
            4: FieldDef(name="last_tick", kind=s.F64),
            5: FieldDef(name="stage", kind=s.I32),
            6: FieldDef(name="stage_progress", kind=s.F64),
            7: FieldDef(name="water_level", kind=s.F64),
            8: FieldDef(name="wilt", kind=s.F64),
            9: FieldDef(name="expected_blocks", kind=s.OptionalTensorBlob),
            10: FieldDef(name="status", kind=s.PlantStatus),
            11: FieldDef(name="variant", kind=s.OptionalI32),
            12: FieldDef(name="buffs", kind=s.BiomesIdList),
            14: FieldDef(name="water_at", kind=s.OptionalF64),
            15: FieldDef(name="player_actions", kind=s.FarmingPlayerActionList),
            16: FieldDef(name="fully_grown_at", kind=s.OptionalF64),
            17: FieldDef(name="next_stage_at", kind=s.OptionalF64),
        },
    )

    g.add_component(
        id=103,
        name="ShardFarming",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            3: FieldDef(name="buffer", kind=s.Buffer),
        },
    )

    g.add_component(
        id=104,
        name="CreatedBy",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="id", kind=s.BiomesId),
            2: FieldDef(name="created_at", kind=s.F64),
        },
    )

    g.add_component(
        id=105,
        name="MinigameComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="metadata", kind=s.MinigameMetadata),
            2: FieldDef(name="stats_changed_at", kind=s.OptionalF64),
            3: FieldDef(name="ready", kind=s.Bool),
            4: FieldDef(name="minigame_element_ids", kind=s.BiomesIdSet),
            5: FieldDef(name="active_instance_ids", kind=s.BiomesIdSet),
            6: FieldDef(name="hero_photo_id", kind=s.OptionalBiomesId),
            7: FieldDef(name="minigame_settings", kind=s.OptionalBuffer),
            8: FieldDef(name="entry_price", kind=s.OptionalF64),
            10: FieldDef(name="game_modified_at", kind=s.OptionalF64),
        },
    )

    g.add_component(
        id=106,
        name="MinigameInstance",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="state", kind=s.MinigameInstanceState),
            2: FieldDef(name="minigame_id", kind=s.BiomesId),
            3: FieldDef(name="finished", kind=s.Bool),
            4: FieldDef(
                name="active_players", kind=s.MinigameInstanceActivePlayerMap
            ),
            # 5: FieldDef
            6: FieldDef(
                name="space_clipboard",
                kind=s.OptionalMinigameInstanceSpaceClipboardInfo,
            ),
            7: FieldDef(
                name="instance_element_ids",
                kind=s.BiomesIdSet,
            ),
        },
    )

    g.add_component(
        id=107,
        name="PlayingMinigame",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="minigame_id", kind=s.BiomesId),
            2: FieldDef(name="minigame_instance_id", kind=s.BiomesId),
            3: FieldDef(name="minigame_type", kind=s.MinigameType),
        },
    )

    g.add_component(
        id=108,
        name="MinigameElement",
        visibility=ComponentVisibility.EVERYONE,
        fields={1: FieldDef(name="minigame_id", kind=s.BiomesId)},
    )

    g.add_component(
        id=109,
        name="ActiveTray",
        visibility=ComponentVisibility.EVERYONE,
        fields={1: FieldDef(name="id", kind=s.BiomesId)},
    )

    g.add_component(
        id=115,
        name="Stashed",
        visibility=ComponentVisibility.SERVER,
        fields={
            1: FieldDef(name="stashed_at", kind=s.F64),
            2: FieldDef(name="stashed_by", kind=s.BiomesId),
            3: FieldDef(name="original_entity_id", kind=s.BiomesId),
        },
    )

    g.add_component(
        id=117,
        name="MinigameInstanceTickInfo",
        visibility=ComponentVisibility.SERVER,
        fields={
            1: FieldDef(name="last_tick", kind=s.F64),
            2: FieldDef(name="trigger_at", kind=s.F64),
        },
    )

    g.add_component(
        id=118,
        name="WarpingTo",
        visibility=ComponentVisibility.SELF,
        fields={
            1: FieldDef(name="position", kind=s.Vec3f),
            2: FieldDef(name="orientation", kind=s.OptionalVec2f),
            3: FieldDef(name="set_at", kind=s.F64),
        },
    )

    g.add_component(
        id=119,
        name="MinigameInstanceExpire",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="trigger_at", kind=s.F64),
        },
    )

    g.add_component(
        id=121,
        name="PlacerComponent",
        visibility=ComponentVisibility.SERVER,
        fields={
            3: FieldDef(name="buffer", kind=s.OptionalBuffer),
        },
    )

    g.add_component(
        id=122,
        name="QuestGiver",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="concurrent_quests", kind=s.OptionalI32),
            2: FieldDef(name="concurrent_quest_dialog", kind=s.OptionalString),
        },
    )

    g.add_component(
        id=123,
        name="DefaultDialog",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="text", kind=s.String),
            2: FieldDef(name="modified_at", kind=s.OptionalF64),
            3: FieldDef(name="modified_by", kind=s.OptionalBiomesId),
        },
    )

    g.add_component(
        id=125,
        name="Unmuck",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            2: FieldDef(name="volume", kind=s.Volume),
            3: FieldDef(name="snapToGrid", kind=s.OptionalU32),
        },
    )

    g.add_component(
        id=126,
        name="RobotComponent",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="trigger_at", kind=s.OptionalF64),
            2: FieldDef(name="internal_battery_charge", kind=s.OptionalF64),
            3: FieldDef(name="internal_battery_capacity", kind=s.OptionalF64),
            4: FieldDef(name="last_update", kind=s.OptionalF64),
        },
    )

    g.add_component(
        id=140,
        name="AdminEntity",
        visibility=ComponentVisibility.EVERYONE,
        fields={},
    )

    g.add_component(
        id=127,
        name="Protection",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="timestamp", kind=s.OptionalF64),
        },
    )

    g.add_component(
        id=128,
        name="ProjectsProtection",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            # The child entity that is to have the Protection component.
            # This is expected to be initialized to empty, with the expectation
            # that the side-effects server will fill it in.
            1: FieldDef(name="protectionChildId", kind=s.OptionalBiomesId),
            5: FieldDef(name="restorationChildId", kind=s.OptionalBiomesId),
            2: FieldDef(name="size", kind=s.Vec3f),
            3: FieldDef(name="protection", kind=s.OptionalProtectionParams),
            4: FieldDef(name="restoration", kind=s.OptionalRestorationParams),
            6: FieldDef(name="timestamp", kind=s.OptionalF64),
            7: FieldDef(name="snapToGrid", kind=s.OptionalU32),
        },
    )

    # When set on an entity, the sidefx server will ensure that if the
    # entity referenced by this component goes away, then so will this entity.
    # Entity is also deleted if targeted entity is iced (though in the future
    # this behavior could be made into an option).
    # This component is usually added to entities created automatically
    # by the sidefx server, such that their cleanup can also be automatic.
    g.add_component(
        id=129,
        name="DeletesWith",
        visibility=ComponentVisibility.SERVER,
        fields={
            1: FieldDef(name="id", kind=s.BiomesId),
        },
    )

    g.add_component(
        id=130,
        name="ItemBuyer",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            # 1: FieldDef(name="spec", kind=s.ItemBuyerSpec),
            2: FieldDef(name="attribute_ids", kind=s.BiomesIdList),
            3: FieldDef(name="buy_description", kind=s.OptionalString),
        },
    )

    g.add_component(
        id=131,
        name="InspectionTweaks",
        visibility=ComponentVisibility.EVERYONE,
        fields={1: FieldDef(name="hidden", kind=s.OptionalBool)},
    )

    g.add_component(
        id=132,
        name="ProfilePic",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="cloud_bundle", kind=s.BucketedImageCloudBundle),
            2: FieldDef(name="hash", kind=s.OptionalString),
        },
    )

    g.add_component(
        id=133,
        name="EntityDescription",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="text", kind=s.String),
        },
    )

    g.add_component(
        id=134,
        name="Landmark",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="override_name", kind=s.OptionalString),
            2: FieldDef(name="importance", kind=s.OptionalU32),
        },
    )

    g.add_component(
        id=135,
        name="Collideable",
        visibility=ComponentVisibility.EVERYONE,
        fields={},
    )

    g.add_component(
        id=136,
        name="Restoration",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="timestamp", kind=s.OptionalF64),
            2: FieldDef(name="restore_delay_s", kind=s.F64),
        },
    )

    # Special case of restoration tracking data for terrain, so that we
    # can track restoration state per-voxel.
    g.add_component(
        id=137,
        name="TerrainRestorationDiff",
        # Needs everyone visibility so that client's can know if they have
        # permission to destroy shards. E.g. as-is, non-owners are allowed to
        # destroy blocks that other non-owners placed in a protected domain,
        # and so the client needs this information to resolve permissions.
        visibility=ComponentVisibility.EVERYONE,
        # A list of restore entries, where there is at most one for each
        # voxel in the tensor.
        fields={
            6: FieldDef(name="restores", kind=s.TerrainRestorationEntryList)
        },
    )

    g.add_component(
        id=138,
        name="Team",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="members", kind=s.TeamMembers),
            2: FieldDef(name="pending_invites", kind=s.TeamPendingInvites),
            3: FieldDef(name="icon", kind=s.OptionalString),
            4: FieldDef(name="color", kind=s.OptionalI32),
            5: FieldDef(name="hero_photo_id", kind=s.OptionalBiomesId),
            6: FieldDef(name="pending_requests", kind=s.TeamPendingRequests),
        },
    )

    g.add_component(
        id=139,
        name="PlayerCurrentTeam",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="team_id", kind=s.BiomesId),
        },
    )

    g.add_component(
        id=141,
        name="UserRoles",
        visibility=ComponentVisibility.SELF,
        fields={
            1: FieldDef(name="roles", kind=s.UserRoleSet),
        },
    )

    g.add_component(
        id=142,
        name="RestoresTo",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="trigger_at", kind=s.F64),
            # If true, means that we should bring back the iced entity to
            # existence at the trigger time, otherwise we should delete the
            # entity.
            2: FieldDef(name="restore_to_state", kind=s.EntityRestoreToState),
            # True for expire: this entity is timing out
            3: FieldDef(name="expire", kind=s.OptionalBool),
        },
    )

    g.add_component(
        id=143,
        name="Trade",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="trader1", kind=s.Trader),
            2: FieldDef(name="trader2", kind=s.Trader),
            3: FieldDef(
                name="trigger_at", kind=s.OptionalF64
            ),  # Trade deleted after this time
        },
    )

    g.add_component(
        id=144,
        name="ActiveTrades",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="trades", kind=s.TradeSpecList),
        },
    )

    g.add_component(
        id=145,
        name="PlacedBy",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="id", kind=s.BiomesId),
            2: FieldDef(name="placed_at", kind=s.F64),
        },
    )

    g.add_component(
        id=146,
        name="TextSign",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="text", kind=s.Strings),
        },
    )

    g.add_component(
        id=147,
        name="Irradiance",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="intensity", kind=s.U8),
            2: FieldDef(name="color", kind=s.Vec3f),
        },
    )

    g.add_component(
        id=148,
        name="LockedInPlace",
        visibility=ComponentVisibility.EVERYONE,
        fields={},
    )

    g.add_component(
        id=149,
        name="DeathInfo",
        visibility=ComponentVisibility.SELF,
        fields={
            1: FieldDef(name="last_death_pos", kind=s.OptionalVec3f),
            2: FieldDef(name="last_death_time", kind=s.OptionalF64),
        },
    )

    g.add_component(
        id=150,
        name="SyntheticStats",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="online_players", kind=s.U32),
        },
    )

    g.add_component(
        id=151, name="Idle", visibility=ComponentVisibility.EVERYONE, fields={}
    )

    g.add_component(
        id=152,
        name="Voice",
        visibility=ComponentVisibility.EVERYONE,
        fields={
            1: FieldDef(name="voice", kind=s.String),
        },
    )

    g.add_component(
        id=153,
        name="GiftGiver",
        visibility=ComponentVisibility.SELF,
        fields={
            1: FieldDef(name="last_gift_time", kind=s.OptionalF64),
            2: FieldDef(name="gift_targets", kind=s.BiomesIdList),
        },
    )


def define_entities(g: Generator):
    s = g.symbols

    g.add_entity(
        "Player",
        [
            s.Label,
            s.AppearanceComponent,
            s.Position,
            s.Orientation,
            s.RigidBody,
            s.Inventory,
            s.SelectedItem,
            s.Emote,
            s.RemoteConnection,
            s.Challenges,
            s.RecipeBook,
            s.Wearing,
            s.PlayerStatus,
            s.PlayerBehavior,
            s.GroupPreviewReference,
            s.Health,
            s.BuffsComponent,
        ],
    )

    g.add_entity(
        "Npc",
        [
            s.NpcMetadata,
            s.NpcState,
            s.Orientation,
            s.Position,
            s.RigidBody,
            s.Size,
            s.Health,
        ],
    )

    g.add_entity("NpcSpawnEvent", [])

    g.add_entity(
        "Placeable",
        [
            s.Position,
            s.Orientation,
            s.PlaceableComponent,
            s.PictureFrameContents,
        ],
    )

    g.add_entity(
        "Container",
        [
            s.Position,
            s.Orientation,
            s.PlaceableComponent,
            s.ContainerInventory,
        ],
    )

    g.add_entity(
        "PricedContainer",
        [
            s.Position,
            s.Orientation,
            s.PlaceableComponent,
            s.PricedContainerInventory,
        ],
    )

    g.add_entity(
        "TerrainShard",
        [
            s.Box,
            s.ShardSeed,
            s.ShardDiff,
            s.ShardShapes,
            s.ShardSkyOcclusion,
            s.ShardIrradiance,
            s.ShardWater,
            s.ShardOccupancy,
            s.ShardPlacer,
            s.ShardFarming,
            s.ShardGrowth,
            s.ShardDye,
            s.ShardMoisture,
            s.ShardMuck,
        ],
    )

    g.add_entity(
        "EnvironmentGroup",
        [
            s.Box,
            s.GroupComponent,
            s.Label,
            s.Warpable,
        ],
    )

    g.add_entity(
        "Blueprint",
        [
            s.Position,
            s.Orientation,
            s.BlueprintComponent,
        ],
    )

    g.add_entity(
        "CraftingStation",
        [
            s.Position,
            s.Orientation,
            s.PlaceableComponent,
            s.CraftingStationComponent,
        ],
    )

    g.add_entity(
        "Portal",
        [
            s.Warpable,
        ],
    )

    g.add_entity(
        "GroupPreview",
        [
            s.Box,
            s.GroupComponent,
            s.Expires,
            s.GroupPreviewComponent,
        ],
    )

    g.add_entity(
        "Deed",
        [
            s.Label,
            s.Box,
            s.AclComponent,
            s.DeedComponent,
        ],
    )

    g.add_entity(
        "FarmingPlant",
        [s.Position, s.FarmingPlantComponent],
    )

    g.add_entity(
        "Robot",
        [
            s.RobotComponent,
        ],
    )


def define_events(g: Generator):
    s = g.symbols

    g.add_event(
        "DisconnectPlayer",
        OrderedDict(
            id=s.BiomesId,
        ),
    )

    g.add_event(
        "Move",
        OrderedDict(
            id=s.BiomesId,
            position=s.OptionalVec3f,
            velocity=s.OptionalVec3f,
            orientation=s.OptionalVec2f,
        ),
    )

    g.add_event(
        "IdleChange",
        OrderedDict(
            id=s.BiomesId,
            idle=s.Bool,
        ),
    )

    g.add_event(
        "EnterRobotField",
        OrderedDict(
            id=s.BiomesId,
            robot_id=s.BiomesId,
        ),
    )

    g.add_event(
        "Warp",
        OrderedDict(
            id=s.BiomesId,
            position=s.Vec3f,
            orientation=s.OptionalVec2f,
            cost=s.U64,
            royalty=s.U64,
            royaltyTarget=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "WarpHome",
        OrderedDict(
            id=s.BiomesId,
            position=s.Vec3f,
            orientation=s.Vec2f,
            reason=s.WarpHomeReason,
        ),
    )

    g.add_event(
        "Edit",
        OrderedDict(
            id=s.BiomesId,
            position=s.Vec3i,
            value=s.U32,
            user_id=s.BiomesId,
            tool_ref=s.OwnedItemReference,
            blueprint_entity_id=s.OptionalBiomesId,
            blueprint_completed=s.OptionalBool,
        ),
    )

    g.add_event(
        "Shape",
        OrderedDict(
            id=s.BiomesId,
            position=s.Vec3i,
            isomorphism=s.U32,
            user_id=s.BiomesId,
            tool_ref=s.OwnedItemReference,
            blueprint_entity_id=s.OptionalBiomesId,
            blueprint_completed=s.OptionalBool,
        ),
    )

    g.add_event(
        "Farming",
        OrderedDict(
            id=s.BiomesId,
            updates=s.TerrainUpdateList,
        ),
    )

    g.add_event(
        "DumpWater",
        OrderedDict(
            id=s.BiomesId,
            pos=s.Vec3i,
        ),
    )

    g.add_event(
        "ScoopWater",
        OrderedDict(
            id=s.BiomesId,
            pos=s.Vec3i,
        ),
    )

    g.add_event(
        "InventoryCombine",
        OrderedDict(
            player_id=s.BiomesId,
            src_id=s.BiomesId,
            src=s.OwnedItemReference,
            dst_id=s.OptionalBiomesId,
            dst=s.OwnedItemReference,
            count=s.U64,
            positions=s.Vec3iList,
        ),
    )

    g.add_event(
        "InventorySplit",
        OrderedDict(
            player_id=s.BiomesId,
            src_id=s.BiomesId,
            src=s.OwnedItemReference,
            dst_id=s.OptionalBiomesId,
            dst=s.OwnedItemReference,
            count=s.U64,
            positions=s.Vec3iList,
        ),
    )

    g.add_event("InventorySort", OrderedDict(id=s.BiomesId))

    g.add_event(
        "InventorySwap",
        OrderedDict(
            player_id=s.BiomesId,
            src_id=s.BiomesId,
            src=s.OwnedItemReference,
            dst_id=s.OptionalBiomesId,
            dst=s.OwnedItemReference,
            positions=s.Vec3iList,
        ),
    )

    g.add_event(
        "RobotInventorySwap",
        OrderedDict(
            id=s.BiomesId,
            src=s.OwnedItemReference,
            dst=s.OwnedItemReference,
            dst_id=s.BiomesId,
        ),
    )

    g.add_event(
        "InventoryThrow",
        OrderedDict(
            id=s.BiomesId,
            src=s.OwnedItemReference,
            count=s.OptionalU64,
            position=s.Vec3f,
        ),
    )

    g.add_event(
        "InventoryDestroy",
        OrderedDict(
            id=s.BiomesId, src=s.OwnedItemReference, count=s.OptionalU64
        ),
    )

    g.add_event(
        "DyeBlock",
        OrderedDict(
            id=s.BiomesId,
            dye=s.U8,
            position=s.Vec3i,
            user_id=s.BiomesId,
        ),
    )

    # Intended for gremlins to stress-test muck clearing.
    g.add_event(
        "Unmucker",
        OrderedDict(
            id=s.BiomesId,
            unmucker=s.OptionalBool,
        ),
    )

    # Intended for internal use only (e.g. load testing gremlins).
    g.add_event(
        "InternalInventorySet",
        OrderedDict(
            id=s.BiomesId,
            dst=s.OwnedItemReference,
            item=s.OptionalItemAndCount,
        ),
    )

    g.add_event(
        "InventoryCraft",
        OrderedDict(
            id=s.BiomesId,
            recipe=s.Item,
            slot_refs=s.OwnedItemReferenceList,
            stationEntityId=s.BiomesId,
        ),
    )

    g.add_event(
        "InventoryDye",
        OrderedDict(
            id=s.BiomesId,
            src=s.OwnedItemReference,
            dst=s.OwnedItemReference,
        ),
    )

    g.add_event(
        "InventoryCook",
        OrderedDict(
            id=s.BiomesId,
            src=s.InventoryAssignmentPattern,
            stationEntityId=s.BiomesId,
        ),
    )

    g.add_event(
        "InventoryCompost",
        OrderedDict(
            id=s.BiomesId,
            src=s.InventoryAssignmentPattern,
            stationEntityId=s.BiomesId,
        ),
    )

    g.add_event(
        "InventoryChangeSelection",
        OrderedDict(
            id=s.BiomesId,
            ref=s.OwnedItemReference,
        ),
    )

    # For e.g. adjusting the currently specified camera mode.
    g.add_event(
        "ChangeCameraMode",
        OrderedDict(
            id=s.BiomesId,
            mode=s.CameraMode,
        ),
    )

    # To Overflow from Inventory
    g.add_event(
        "OverflowMoveToInventory",
        OrderedDict(
            id=s.BiomesId, payload=s.ItemBag, dst=s.OptionalOwnedItemReference
        ),
    )

    # From Inventory to Overflow
    g.add_event(
        "InventoryMoveToOverflow",
        OrderedDict(id=s.BiomesId, src=s.OwnedItemReference, count=s.U64),
    )

    g.add_event(
        "AppearanceChange",
        OrderedDict(id=s.BiomesId, appearance=s.Appearance),
    )

    g.add_event(
        "HairTransplant",
        OrderedDict(
            id=s.BiomesId,
            newHairId=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "Emote",
        OrderedDict(
            id=s.BiomesId,
            emote_type=s.OptionalEmoteType,
            nonce=s.OptionalF64,
            rich_emote_components=s.OptionalRichEmoteComponents,
            start_time=s.OptionalF64,
            expiry_time=s.OptionalF64,
        ),
    )

    g.add_event(
        "StartPlaceableAnimation",
        OrderedDict(
            id=s.BiomesId,
            animation_type=s.PlaceableAnimationType,
        ),
    )

    g.add_event(
        "PlacePlaceable",
        OrderedDict(
            id=s.BiomesId,
            placeable_item=s.Item,
            inventory_item=s.Item,
            inventory_ref=s.OwnedItemReference,
            position=s.Vec3f,
            orientation=s.Vec2f,
            minigame_id=s.OptionalBiomesId,
            existing_placeable=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "DestroyPlaceable",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            tool_ref=s.OwnedItemReference,
            expired=s.OptionalBool,
        ),
    )

    g.add_event(
        "ChangePictureFrameContents",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            photo_id=s.OptionalBiomesId,
            minigame_id=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "ChangeTextSignContents",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            text=s.Strings,
        ),
    )

    g.add_event(
        "UpdateVideoSettings",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            video_url=s.OptionalString,
            muted=s.Bool,
        ),
    )

    g.add_event(
        "SellInContainer",
        OrderedDict(
            id=s.BiomesId,
            seller_id=s.BiomesId,
            src=s.OwnedItemReference,
            sell_item=s.ItemAndCount,
            dst_slot=s.OwnedItemReference,
            dst_price=s.ItemAndCount,
        ),
    )

    g.add_event(
        "PurchaseFromContainer",
        OrderedDict(
            id=s.BiomesId,
            purchaser_id=s.BiomesId,
            seller_id=s.BiomesId,
            src=s.OwnedItemReference,
            quantity=s.OptionalU32,
        ),
    )

    g.add_event(
        "UpdateRobotName",
        OrderedDict(
            id=s.BiomesId,
            player_id=s.BiomesId,
            entity_id=s.BiomesId,
            name=s.String,
        ),
    )

    g.add_event(
        "PlaceRobot",
        OrderedDict(
            id=s.BiomesId,
            robot_entity_id=s.OptionalBiomesId,
            inventory_ref=s.OwnedItemReference,
            position=s.Vec3f,
            orientation=s.Vec2f,
            item_id=s.BiomesId,
        ),
    )

    g.add_event(
        "EndPlaceRobot",
        OrderedDict(
            id=s.BiomesId,
            robot_entity_id=s.BiomesId,
            position=s.Vec3f,
            orientation=s.Vec2f,
        ),
    )

    g.add_event(
        "PickUpRobot",
        OrderedDict(
            id=s.BiomesId,
            player_id=s.BiomesId,
            entity_id=s.BiomesId,
        ),
    )

    g.add_event(
        "UpdateProjectedRestoration",
        OrderedDict(
            id=s.BiomesId,
            player_id=s.BiomesId,
            entity_id=s.BiomesId,
            restore_delay_s=s.OptionalF64,
        ),
    )

    g.add_event(
        "LabelChange",
        OrderedDict(
            id=s.BiomesId,
            text=s.String,
        ),
    )

    g.add_event(
        "CreateGroup",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            name=s.String,
            warp=s.OptionalWarpTarget,
            tensor=s.TensorBlob,
            box=s.Box2,
            placeable_ids=s.BiomesIdList,
            position=s.Vec3f,  # wand position
        ),
    )

    g.add_event(
        "PlaceBlueprint",
        OrderedDict(
            id=s.BiomesId,
            inventory_ref=s.OwnedItemReference,
            item=s.BiomesId,
            position=s.Vec3f,
            orientation=s.Vec2f,
        ),
    )

    g.add_event(
        "DestroyBlueprint",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            tool_ref=s.OwnedItemReference,
            position=s.Vec3f,
        ),
    )

    g.add_event(
        "CreateCraftingStation",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
        ),
    )

    g.add_event(
        "FeedRobot",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            amount=s.U64,
        ),
    )

    g.add_event(
        "PlaceGroup",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            inventory_ref=s.OwnedItemReference,
            warp=s.WarpTarget,
            box=s.Box2,
            rotation=s.OptionalU32,
            reflection=s.OptionalVec3f,
            tensor=s.TensorBlob,
            name=s.String,
        ),
    )

    g.add_event(
        "CloneGroup",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            inventory_ref=s.OwnedItemReference,
            box=s.Box2,
            rotation=s.OptionalU32,
            reflection=s.OptionalVec3f,
            tensor=s.TensorBlob,
        ),
    )

    g.add_event(
        "DestroyGroup",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            position=s.Vec3f,
            tool_ref=s.OwnedItemReference,
            rotation=s.OptionalU32,
            placeable_ids=s.BiomesIdList,
        ),
    )

    g.add_event(
        "CaptureGroup",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
        ),
    )

    g.add_event(
        "UnGroup",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            remove_voxels=s.Bool,
        ),
    )

    g.add_event(
        "RepairGroup",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
        ),
    )

    g.add_event(
        "UpdateGroupPreview",
        OrderedDict(
            id=s.BiomesId,
            tensor=s.TensorBlob,
            box=s.Box2,
            blueprint_id=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "DeleteGroupPreview",
        OrderedDict(
            id=s.BiomesId,
        ),
    )

    g.add_event(
        "RestoreGroup",
        OrderedDict(
            id=s.BiomesId,
            placeable_ids=s.BiomesIdList,
            restoreRegion=s.OptionalAabb,
        ),
    )
    g.add_event(
        "RestorePlaceable",
        OrderedDict(
            id=s.BiomesId,
            restoreRegion=s.OptionalAabb,
        ),
    )

    g.add_event(
        "CreatePhotoPortal",  # Should be priviledged
        OrderedDict(
            id=s.BiomesId,
            photo_id=s.BiomesId,
            photo_author_id=s.BiomesId,
            position=s.Vec3f,
            orientation=s.Vec2f,
        ),
    )

    g.add_event(
        "Consumption",
        OrderedDict(
            id=s.BiomesId,
            item_id=s.BiomesId,
            inventory_ref=s.OwnedItemReference,
            action=s.ConsumptionAction,
        ),
    )

    g.add_event(
        "RemoveBuff",
        OrderedDict(
            id=s.BiomesId,
            buff=s.Buff,
        ),
    )

    g.add_event(
        "AdminInventoryGroup",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
        ),
    )

    g.add_event(
        "AdminResetChallenges",  # Should be priviledged
        OrderedDict(
            id=s.BiomesId,
            challenge_states=s.ChallengeStateMap,
        ),
    )

    g.add_event(
        "AdminResetRecipe",
        OrderedDict(
            id=s.BiomesId,
            recipe_id=s.BiomesId,
            clear_all=s.OptionalBool,
        ),
    )

    g.add_event(
        "AdminResetInventory",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
        ),
    )

    g.add_event(
        "AdminSetInfiniteCapacityContainer",
        OrderedDict(id=s.BiomesId, infinite_capacity=s.Bool),
    )
    g.add_event(
        "AdminGiveItem",
        OrderedDict(
            id=s.BiomesId,
            bag=s.ItemBag,
            toOverflow=s.OptionalBool,
        ),
    )
    g.add_event(
        "AdminRemoveItem",
        OrderedDict(id=s.BiomesId, ref=s.OwnedItemReference),
    )
    g.add_event(
        "AdminDelete",
        OrderedDict(id=s.BiomesId, entity_id=s.BiomesId),
    )
    g.add_event("AdminIce", OrderedDict(id=s.BiomesId, entity_id=s.BiomesId))

    g.add_event(
        "PlayerInit",
        OrderedDict(
            id=s.BiomesId,
        ),
    )

    g.add_event(
        "UpdatePlayerHealth",
        OrderedDict(
            id=s.BiomesId,
            hp=s.OptionalI32,
            hpDelta=s.OptionalI32,
            maxHp=s.OptionalI32,
            damageSource=s.OptionalDamageSource,
        ),
    )

    g.add_event(
        "UpdateNpcHealth",
        OrderedDict(
            id=s.BiomesId,
            hp=s.I32,
            damageSource=s.OptionalDamageSource,
        ),
    )

    g.add_event(
        "PickUp",
        OrderedDict(
            id=s.BiomesId,
            item=s.BiomesId,
        ),
    )

    g.add_event(
        "RemoveMapBeam",
        OrderedDict(
            id=s.BiomesId,
            beam_client_id=s.I32,
            beam_location=s.Vec2f,
        ),
    )

    g.add_event(
        "SetNUXStatus",
        OrderedDict(
            id=s.BiomesId,
            nux_id=s.I32,
            status=s.NUXStatus,
        ),
    )

    g.add_event(
        "AcceptChallenge",
        OrderedDict(
            id=s.BiomesId,
            challenge_id=s.BiomesId,
            npc_id=s.BiomesId,
            chosen_gift_index=s.I32,
        ),
    )

    g.add_event(
        "CompleteQuestStepAtEntity",
        OrderedDict(
            id=s.BiomesId,
            challenge_id=s.BiomesId,
            entity_id=s.BiomesId,
            step_id=s.BiomesId,
            chosen_reward_index=s.I32,
        ),
    )

    g.add_event(
        "ResetChallenge",
        OrderedDict(
            id=s.BiomesId,
            challenge_id=s.BiomesId,
        ),
    )

    g.add_event(
        "ExpireBuffs",
        OrderedDict(
            id=s.BiomesId,
        ),
    )

    g.add_event(
        "ExpireRobot",
        OrderedDict(
            id=s.BiomesId,
        ),
    )

    g.add_event(
        "AdminEditPreset",
        OrderedDict(
            id=s.BiomesId,
            preset_id=s.BiomesId,
            name=s.String,
        ),
    )

    g.add_event(
        "AdminSavePreset",
        OrderedDict(
            id=s.BiomesId,
            name=s.String,
            preset_id=s.BiomesId,
            player_id=s.BiomesId,
        ),
    )

    g.add_event(
        "AdminLoadPreset",
        OrderedDict(id=s.BiomesId, preset_id=s.BiomesId, player_id=s.BiomesId),
    )

    # Farming events
    g.add_event(
        "TillSoil",
        OrderedDict(
            id=s.BiomesId,
            positions=s.Vec3iList,
            shard_ids=s.BiomesIdList,
            tool_ref=s.OwnedItemReference,
            occupancy_ids=s.BiomesIdList,
        ),
    )
    g.add_event(
        "PlantSeed",
        OrderedDict(
            id=s.BiomesId,
            position=s.Vec3i,
            user_id=s.BiomesId,
            seed=s.OwnedItemReference,
            occupancy_id=s.OptionalBiomesId,
            existing_farming_id=s.OptionalBiomesId,  # Only used to resolve any dangling farming IDs
        ),
    )
    g.add_event(
        "WaterPlants",
        OrderedDict(
            id=s.BiomesId,
            plant_ids=s.BiomesIdList,
            tool_ref=s.OwnedItemReference,
        ),
    )
    g.add_event(
        "FertilizePlant",
        OrderedDict(
            id=s.BiomesId,
            user_id=s.BiomesId,
            tool_ref=s.OwnedItemReference,
        ),
    )
    g.add_event(
        "AdminDestroyPlant",
        OrderedDict(
            id=s.BiomesId,
            plant_id=s.BiomesId,
        ),
    )

    g.add_event(
        "FishingClaim",
        OrderedDict(
            id=s.BiomesId,
            bag=s.ItemBag,
            tool_ref=s.OwnedItemReference,
            catch_time=s.F64,
        ),
    )
    g.add_event(
        "FishingCaught",
        OrderedDict(
            id=s.BiomesId,
            bag=s.ItemBag,
        ),
    )
    g.add_event(
        "FishingFailed",
        OrderedDict(
            id=s.BiomesId,
            tool_ref=s.OwnedItemReference,
            catch_time=s.F64,
        ),
    )
    g.add_event(
        "FishingConsumeBait",
        OrderedDict(
            id=s.BiomesId, ref=s.OwnedItemReference, item_id=s.BiomesId
        ),
    )
    g.add_event(
        "TreasureRoll",
        OrderedDict(id=s.BiomesId, ref=s.OwnedItemReference, item=s.Item),
    )

    #
    # Minigames start!
    #
    g.add_event(
        "CreateOrJoinSpleef",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_instance_id=s.OptionalBiomesId,
            box=s.Box2,
        ),
    )

    g.add_event(
        "JoinDeathmatch",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_instance_id=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "FinishSimpleRaceMinigame",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_element_id=s.BiomesId,
            minigame_instance_id=s.BiomesId,
        ),
    )

    g.add_event(
        "StartSimpleRaceMinigame",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_element_id=s.BiomesId,
        ),
    )

    g.add_event(
        "ReachStartSimpleRaceMinigame",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_element_id=s.BiomesId,
            minigame_instance_id=s.BiomesId,
        ),
    )

    g.add_event(
        "ReachCheckpointSimpleRaceMinigame",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_element_id=s.BiomesId,
            minigame_instance_id=s.BiomesId,
        ),
    )

    g.add_event(
        "RestartSimpleRaceMinigame",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_instance_id=s.BiomesId,
        ),
    )

    g.add_event(
        "TagMinigameHitPlayer",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_instance_id=s.BiomesId,
            hit_player_id=s.BiomesId,
        ),
    )

    g.add_event(
        "QuitMinigame",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_instance_id=s.BiomesId,
        ),
    )

    g.add_event(
        "GiveMinigameKit",
        OrderedDict(
            id=s.BiomesId,
            kit=s.GiveMinigameKitData,
        ),
    )

    g.add_event(
        "TouchMinigameStats",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
        ),
    ),

    g.add_event(
        "EditMinigameMetadata",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            label=s.OptionalString,
            hero_photo_id=s.OptionalBiomesId,
            minigame_settings=s.OptionalBuffer,
            entry_price=s.OptionalF64,
        ),
    ),

    g.add_event(
        "MinigameInstanceTick",
        OrderedDict(
            minigame_id=s.BiomesId,
            minigame_instance_id=s.BiomesId,
            denorm_space_clipboard_info=s.OptionalMinigameInstanceSpaceClipboardInfo,
        ),
    )

    g.add_event(
        "ExpireMinigameInstance",
        OrderedDict(
            minigame_id=s.BiomesId,
            minigame_instance_id=s.BiomesId,
            denorm_space_clipboard_info=s.OptionalMinigameInstanceSpaceClipboardInfo,
        ),
    )

    g.add_event(
        "AssociateMinigameElement",
        OrderedDict(
            id=s.BiomesId,
            minigame_id=s.BiomesId,
            minigame_element_id=s.BiomesId,
            old_minigame_id=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "CreateMinigameThroughAssocation",
        OrderedDict(
            id=s.BiomesId,
            name=s.String,
            minigameType=s.MinigameType,
            minigame_element_id=s.BiomesId,
            old_minigame_id=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "AckWarp",
        OrderedDict(
            id=s.BiomesId,
        ),
    )

    g.add_event(
        "ReplenishWateringCan",
        OrderedDict(
            id=s.BiomesId,
            position=s.Vec3i,
            tool_ref=s.OwnedItemReference,
            user_id=s.BiomesId,
        ),
    )

    g.add_event(
        "SpaceClipboardWandCut",
        OrderedDict(
            id=s.BiomesId,
            item_ref=s.OwnedItemReference,
            box=s.Box2,
        ),
    )

    g.add_event(
        "SpaceClipboardWandCopy",
        OrderedDict(
            id=s.BiomesId,
            item_ref=s.OwnedItemReference,
            box=s.Box2,
        ),
    )

    g.add_event(
        "SpaceClipboardWandPaste",
        OrderedDict(
            id=s.BiomesId,
            item_ref=s.OwnedItemReference,
            space_entity_id=s.BiomesId,
            new_box=s.Box2,
        ),
    )

    g.add_event(
        "SpaceClipboardWandDiscard",
        OrderedDict(
            id=s.BiomesId,
            item_ref=s.OwnedItemReference,
            space_entity_id=s.BiomesId,
            new_box=s.Box2,
        ),
    )

    g.add_event(
        "NegaWandRestore",
        OrderedDict(
            id=s.BiomesId,
            item_ref=s.OwnedItemReference,
            box=s.Box2,
        ),
    )

    g.add_event(
        "PlacerWand",
        OrderedDict(
            id=s.BiomesId,
            item_ref=s.OwnedItemReference,
            positions=s.Vec3iList,
        ),
    )

    g.add_event(
        "ClearPlacer",
        OrderedDict(
            id=s.BiomesId,
            item_ref=s.OwnedItemReference,
            positions=s.Vec3iList,
        ),
    )

    g.add_event(
        "DespawnWand",
        OrderedDict(
            id=s.BiomesId, item_ref=s.OwnedItemReference, entityId=s.BiomesId
        ),
    )

    g.add_event(
        "SellToEntity",
        OrderedDict(
            id=s.BiomesId,
            purchaser_id=s.BiomesId,
            seller_id=s.BiomesId,
            src=s.InventoryAssignmentPattern,
        ),
    )

    g.add_event(
        "SetNPCPosition",
        OrderedDict(
            id=s.BiomesId,
            entity_id=s.BiomesId,
            position=s.OptionalVec3f,
            orientation=s.OptionalVec2f,
            update_spawn=s.OptionalBool,
        ),
    )

    g.add_event(
        "AdminUpdateInspectionTweaks",
        OrderedDict(id=s.BiomesId, entity_id=s.BiomesId, hidden=s.OptionalBool),
    )

    g.add_event(
        "AdminECSDeleteComponent",
        OrderedDict(
            id=s.BiomesId,
            userId=s.BiomesId,
            field=s.String
        )
    )

    g.add_event(
        "AdminECSAddComponent",
        OrderedDict(
            id=s.BiomesId,
            userId=s.BiomesId,
            field=s.String
        )
    )

    g.add_event(
        "AdminECSUpdateComponent",
        OrderedDict(
            id=s.BiomesId,
            userId=s.BiomesId,
            path=s.Strings,
            value=s.String
        )
    )

    g.add_event(
        "CreateTeam",
        OrderedDict(
            id=s.BiomesId,
            name=s.String,
        ),
    )

    g.add_event(
        "UpdateTeamMetadata",
        OrderedDict(
            id=s.BiomesId,
            team_id=s.BiomesId,
            name=s.OptionalString,
            icon=s.OptionalString,
            color=s.OptionalI32,
            hero_photo_id=s.OptionalBiomesId,
        ),
    )

    g.add_event(
        "InvitePlayerToTeam",
        OrderedDict(
            id=s.BiomesId,
            team_id=s.BiomesId,
            player_id=s.BiomesId,
        ),
    )
    g.add_event(
        "RequestToJoinTeam",
        OrderedDict(
            id=s.BiomesId,
            entity_id=s.BiomesId,
            team_id=s.BiomesId,
        ),
    )
    g.add_event(
        "RequestedToJoinTeam",
        OrderedDict(
            id=s.BiomesId,
            entity_id=s.BiomesId,
            team_id=s.BiomesId,
        ),
    )
    g.add_event(
        "CancelRequestToJoinTeam",
        OrderedDict(
            id=s.BiomesId,
            entity_id=s.BiomesId,
            team_id=s.BiomesId,
        ),
    )
    g.add_event(
        "RespondToJoinTeamRequest",
        OrderedDict(
            id=s.BiomesId,
            entity_id=s.BiomesId,
            team_id=s.BiomesId,
            response=s.String,  # "accept" or "decline"
        ),
    )
    g.add_event(
        "RequestToJoinTeamAccepted",
        OrderedDict(
            id=s.BiomesId,
            entity_id=s.BiomesId,
            team_id=s.BiomesId,
        ),
    )
    g.add_event(
        "JoinTeam",
        OrderedDict(
            id=s.BiomesId,
            team_id=s.BiomesId,
        ),
    )
    g.add_event(
        "CancelTeamInvite",
        OrderedDict(
            id=s.BiomesId,
            team_id=s.BiomesId,
            invitee_id=s.BiomesId,
        ),
    )
    g.add_event(
        "KickTeamMember",
        OrderedDict(
            id=s.BiomesId,
            team_id=s.BiomesId,
            kicked_player_id=s.BiomesId,
        ),
    )
    g.add_event(
        "DeclineTeamInvite",
        OrderedDict(
            id=s.BiomesId,
            team_id=s.BiomesId,
        ),
    )
    g.add_event(
        "QuitTeam",
        OrderedDict(
            id=s.BiomesId,
            team_id=s.BiomesId,
        ),
    )

    g.add_event(
        "BeginTrade",
        OrderedDict(
            id=s.BiomesId,
            id2=s.BiomesId,
        ),
    )

    g.add_event(
        "AcceptTrade",
        OrderedDict(
            id=s.BiomesId,
            trade_id=s.BiomesId,
            other_trader_id=s.BiomesId,
        ),
    )

    g.add_event(
        "ChangeTradeOffer",
        OrderedDict(
            id=s.BiomesId,
            offer=s.InventoryAssignmentPattern,
            trade_id=s.BiomesId,
        ),
    )

    g.add_event(
        "ExpireTrade",
        OrderedDict(
            id=s.BiomesId,  # Trade
        ),
    )

    g.add_event(
        "GiveGift",
        OrderedDict(id=s.BiomesId, target=s.BiomesId, target_robot=s.BiomesId),
    )

    g.add_event(
        "GiveMailboxItem",
        OrderedDict(
            player_id=s.BiomesId,
            src_id=s.BiomesId,
            src=s.OwnedItemReference,
            count=s.U64,
            dst_id=s.OptionalBiomesId,
            dst=s.OwnedItemReference,
            target_player_id=s.BiomesId,
            positions=s.Vec3iList,
        ),
    )

    g.add_event(
        "UnwrapWrappedItem",
        OrderedDict(id=s.BiomesId, ref=s.OwnedItemReference, item=s.Item),
    )

    g.add_event(
        "PokePlant",
        OrderedDict(
            id=s.BiomesId,
        ),
    )

    g.add_event(
        "AddToOutfit",
        OrderedDict(
            id=s.BiomesId, # Outfit id
            player_id=s.BiomesId,
            src=s.OwnedItemReference,
        )
    )

    g.add_event(
        "EquipOutfit",
        OrderedDict(
            id=s.BiomesId, # Outfit id
            player_id=s.BiomesId,
        )
    )


def define_selectors(g: Generator):
    s = g.symbols

    # These two are only used for tests.
    g.add_selector("Position", [s.Position])
    g.add_selector("Label", [s.Label])

    g.add_selector(
        "GrabBagSpatial",
        [s.GrabBag, s.Position],
        index_type=IndexType.SPATIAL,
    )

    g.add_selector(
        "Drop",
        [s.LooseItem, s.Position],
    )

    g.add_selector(
        "Npc",
        [
            s.NpcMetadata,
            s.NpcState,
            s.Orientation,
            s.Position,
            s.RigidBody,
            s.Size,
            s.Health,
        ],
    )
    g.add_selector("NpcMetadata", [s.NpcMetadata, s.Position, s.Size])

    g.add_selector(
        "LightSource",
        [
            s.Position,
            s.LockedInPlace,
            s.Irradiance,
        ],
    )
    g.add_selector(
        "UnmuckSource",
        [
            s.Position,
            s.LockedInPlace,
            s.Unmuck,
        ],
    )

    g.add_selector(
        "AudioSource",
        [
            s.Position,
            s.PlaceableComponent,
            s.VideoComponent,
        ],
    )

    g.add_selector(
        "TerrainShard",
        [
            s.Box,
            s.ShardSeed,
            s.ShardDiff,
            s.ShardShapes,
        ],
    )

    g.add_selector(
        "WaterShard",
        [
            s.Box,
            s.ShardWater,
        ],
    )

    g.add_selector(
        "Placeable",
        [
            s.Position,
            s.Orientation,
            s.PlaceableComponent,
        ],
    )

    g.add_selector(
        "Blueprint",
        [
            s.Position,
            s.Orientation,
            s.BlueprintComponent,
        ],
    )

    g.add_selector(
        "CanPickUp",
        [s.Inventory, s.Wearing, s.Position, s.SelectedItem],
    )

    g.add_selector("Player", [s.RemoteConnection, s.Position, s.Label])
    g.add_selector("ActivePlayers", [s.RemoteConnection, s.Position, s.Label])

    g.add_selector(
        "EnvironmentGroup",
        [
            s.Box,
            s.GroupComponent,
            s.Label,
        ],
    )

    g.add_selector(
        "GroupPreview",
        [
            s.Box,
            s.GroupComponent,
            s.GroupPreviewComponent,
        ],
    )
    g.add_selector("ReadyMinigame", [s.MinigameComponent]),
    g.add_selector("MinigameElementByMinigameId", [s.MinigameElement])
    g.add_selector("MinigameElements", [s.MinigameElement])
    g.add_selector("MinigameInstancesByMinigameId", [s.MinigameInstance])
    g.add_selector("PresetByLabel", [s.PresetPrototype, s.Label])

    g.add_selector("Gremlin", [s.Gremlin])
    g.add_selector(
        "FarmingPlant",
        [s.Position, s.FarmingPlantComponent],
    )
    g.add_selector("NamedQuestGiver", [s.Label, s.QuestGiver])

    g.add_selector("Unmuck", [s.Position, s.Unmuck])

    g.add_selector("Robot", [s.Position, s.RobotComponent])
    g.add_selector("RobotsByCreatorId", [s.Position, s.RobotComponent])
    g.add_selector("RobotsByLandmarkName", [s.Position, s.RobotComponent])
    g.add_selector("RobotsThatClear", [s.Position, s.Unmuck, s.RobotComponent])
    g.add_selector("MinigamesByCreatorId", [s.MinigameComponent])
    g.add_selector("Collideable", [s.Collideable, s.Position])
    g.add_selector("PlaceablesByCreatorId", [s.PlaceableComponent, s.CreatedBy])
    g.add_selector(
        "ProtectionByTeamId", [s.Position, s.Size, s.Protection, s.AclComponent]
    )
    g.add_selector("RestoredPlaceable", [s.PlaceableComponent, s.RestoresTo])
    g.add_selector("PlaceablesByItemId", [s.PlaceableComponent])
