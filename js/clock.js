// Footer clocks: my time in Porto Alegre, the visitor's time, and a line about the gap between them.
document.addEventListener("DOMContentLoaded", () =>
{
    const clocks = document.querySelector(".clocks");
    const homeTimeElement = document.getElementById("clock-home");
    const visitorTimeElement = document.getElementById("clock-visitor");
    const visitorLabelElement = document.getElementById("clock-visitor-label");
    const noteElement = document.getElementById("clock-note");

    if (!clocks || !homeTimeElement || !visitorTimeElement || !noteElement)
    {
        return;
    }

    const HOME_ZONE = "America/Sao_Paulo";
    const LAST_NOTE_KEY = "clock-note";

    // 24 hour reading used by the rules below, never shown as is
    function read(zone)
    {
        const options = {
            hour: "2-digit",
            minute: "2-digit",
            weekday: "short",
            hourCycle: "h23"
        };

        if (zone)
        {
            options.timeZone = zone;
        }

        const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(new Date());
        const valueOf = type => parts.find(part => part.type === type).value;

        const hour = Number(valueOf("hour"));
        const weekday = valueOf("weekday");

        return {
            hour: hour,
            minutes: hour * 60 + Number(valueOf("minute")),
            weekend: weekday === "Sat" || weekday === "Sun"
        };
    }

    // both clocks follow the visitor's own format, so 14:40 here reads as 2:40 PM in the US
    function clockFormat(zone)
    {
        const options = {
            hour: "numeric",
            minute: "2-digit"
        };

        if (zone)
        {
            options.timeZone = zone;
        }

        // 12 hour locales read better as 2:40 PM, 24 hour ones as 02:40
        const cycle = new Intl.DateTimeFormat(undefined, options).resolvedOptions().hourCycle;
        if (cycle !== "h11" && cycle !== "h12")
        {
            options.hour = "2-digit";
        }

        return new Intl.DateTimeFormat(undefined, options);
    }

    function moment(time)
    {
        return {
            weekend: time.weekend,
            owl: time.hour < 5,
            dawn: time.hour >= 5 && time.hour < 8,
            morning: time.hour >= 8 && time.hour < 12,
            lunch: time.hour >= 12 && time.hour < 14,
            afternoon: time.hour >= 14 && time.hour < 18,
            evening: time.hour >= 18 && time.hour < 22,
            night: time.hour >= 22,
            asleep: time.hour < 7,
            awake: time.hour >= 8 && time.hour < 23
        };
    }

    // signed distance between the two wall clocks, in hours, wrapped to [-12, 12]
    function gap(home, visitor)
    {
        let difference = home.minutes - visitor.minutes;

        while (difference > 720)
        {
            difference -= 1440;
        }

        while (difference < -720)
        {
            difference += 1440;
        }

        return difference / 60;
    }

    const rules = [
        {
            when: (home, visitor) => visitor.owl && home.awake,
            texts: [
                "Hey night owl, what are you doing here at this hour? Liked me that much? My inbox is one click below.",
                "Middle of the night on your clock, broad daylight on mine. Whatever you are chasing tonight, I hope this page helps.",
                "You are up late and I am two coffees into the day. Between us we cover the whole thing.",
                "It is the small hours where you are. I am awake, so a message would not even have to wait.",
                "Your side of the world is asleep and you are reading credits. That is how I spent most of my twenties.",
                "Night shift on your clock, working hours on mine. Convenient, if you feel like talking."
            ]
        },
        {
            when: (home, visitor) => visitor.owl,
            texts: [
                "Both of us should be asleep. One of my cats is awake too, so the night shift is covered.",
                "Deep night on both clocks. This is the hour when side projects are born and builds get broken.",
                "Late night reading. Careful, this is exactly how game jams start.",
                "Nobody is awake in either of our time zones. Except you, and four cats who never asked permission.",
                "The world is quiet on both our clocks. Good hour to read, terrible hour to push to main.",
                "Middle of the night for both of us. Yours for reading, mine for sleeping. Fair split."
            ]
        },
        {
            when: (home, visitor) => home.asleep && !visitor.owl,
            texts: [
                "It is the middle of the night in Porto Alegre, so I am offline and the cats are guarding the keyboard.",
                "I am asleep while you read this. Leave a message and I will answer once the coffee lands.",
                "My clock says sleep, yours says go. Enjoy the day for both of us.",
                "Porto Alegre is dark and quiet right now. Whatever you send lands in the morning.",
                "You caught me between builds and dreams. The cats handle support until sunrise.",
                "Dead of night here, ordinary day there. Time zones do that."
            ]
        },
        {
            when: (home, visitor, hours) => Math.abs(hours) < 1,
            texts: [
                "Same clock, same coffee break. Say hi and we can skip the time zone math.",
                "We are running on the same hours. Rare and very convenient.",
                "Your clock and mine agree, which makes scheduling a call suspiciously easy.",
                "Different place, same hour. Standups would be painless.",
                "Our clocks match to the minute. No mental arithmetic required today.",
                "Same time of day on both sides. Whatever you are doing now, I am probably doing too."
            ]
        },
        {
            when: (home, visitor, hours) => Math.abs(hours) >= 7,
            texts: [
                "Half a planet between our clocks. Remote work has been good practice for that.",
                "Almost a full day apart. I have shipped enough cross time zone builds to make it work.",
                "Different hemisphere hours entirely. Messages still travel fast.",
                "Your today is nearly my tomorrow. Async is a skill, and I have had plenty of practice.",
                "Hours apart is an understatement. Good thing code review does not need eye contact.",
                "Our working days barely overlap. They have overlapped enough to ship games before."
            ]
        },
        {
            when: (home, visitor) => visitor.weekend && visitor.awake,
            texts: [
                "Portfolio browsing on a weekend. Respect. Should you not be playing something instead?",
                "It is the weekend where you are and you chose to read about gameplay code. I like you already.",
                "Weekend hours. Mine usually go to a controller and four very demanding cats.",
                "Saturday or Sunday on your clock, and you are here. Hope it is curiosity and not crunch.",
                "Weekend on your side. Mine has coffee, a backlog of games, and a cat on the keyboard.",
                "Nothing on your calendar today, yet here you are reading about combat systems. Good taste."
            ]
        },
        {
            when: (home, visitor) => visitor.dawn,
            texts: [
                "Early start on your side. The first coffee is the important one.",
                "Sunrise hours, the quietest time to write code. Nothing to review but your own ideas.",
                "You are up before the rest of your time zone. That is where the good commits hide.",
                "Barely dawn where you are. Cats wake up at this hour too, and they are louder than alarms.",
                "Early bird hours. Mine usually begin with coffee and a compile.",
                "The day is still loading on your side. Good time to read something calm."
            ]
        },
        {
            when: (home, visitor) => visitor.morning,
            texts: [
                "Morning where you are. Good window for reading about combat systems.",
                "Good morning. Coffee first, gameplay code second.",
                "Your day is just starting, mine is already somewhere in the middle.",
                "Morning on your clock. Most of the code I am proud of was written at this hour.",
                "Fresh morning where you are. Enjoy it before the meetings find you.",
                "Mid morning for you. If a cat has not woken you yet, count yourself lucky."
            ]
        },
        {
            when: (home, visitor) => visitor.lunch,
            texts: [
                "Lunch hours on your clock. This page goes well with whatever is on the plate.",
                "Midday for you. A cat would be asleep in a sunbeam right about now.",
                "Lunch break scrolling. Plenty of good ideas have started exactly there.",
                "Noon where you are. Eat something before the afternoon builds start failing.",
                "Lunch time on your side. Mine is usually shared with a cat who disagrees about portions.",
                "Middle of your day. Good moment for a pause and a portfolio."
            ]
        },
        {
            when: (home, visitor) => visitor.afternoon,
            texts: [
                "Afternoon where you are, the hour when builds break and coffee saves the day.",
                "Mid afternoon for you, close enough to my clock that we would be taking a break together.",
                "Good afternoon. If you came for the gameplay work, it is all a scroll up.",
                "Afternoon slump hours. Reading is easier than debugging, I will give you that.",
                "Halfway through your day. Mine too, more or less, depending on the build.",
                "Afternoon on your clock. Second coffee territory."
            ]
        },
        {
            when: (home, visitor) => visitor.evening,
            texts: [
                "Evening where you are. Kind of you to spend it here instead of on a game.",
                "Your day is winding down, mine too, usually with a cat on the desk.",
                "Good evening. Whatever you are building tonight, I hope it compiles.",
                "Evening hours, prime time for games, and you picked a portfolio. Bold.",
                "The day is closing on your side. Mine is at the stage where the cats demand attention.",
                "Evening for you. If this is after hours reading, thank you for the time."
            ]
        },
        {
            when: (home, visitor) => visitor.night,
            texts: [
                "Close to midnight on your clock. The last commit of the day is always the risky one.",
                "Late night where you are. A cat would already be asleep on the warm laptop.",
                "Almost midnight for you. Read the rest tomorrow, this page is not going anywhere.",
                "Your day is almost over while mine sits at a completely different point on the clock.",
                "Late hours on your side. This is when I usually think of one more feature to build.",
                "Nearly midnight where you are. Go to bed, or keep reading. Both are good uses of the hour."
            ]
        }
    ];

    const fallback = [
        "Late hours where you are. Thanks for stopping by.",
        "Whatever your clock says, you are welcome here.",
        "Two clocks, one page. Thanks for the visit.",
        "Our clocks disagree, the coffee does not. Thanks for dropping in.",
        "Wherever your day is right now, thanks for spending part of it here."
    ];

    // shown when there is nothing to compare, because the visitor is on my own clock
    const sameZoneTexts = [
        "Same time zone as mine, so no excuse about schedules. Coffee is on me if you are around Porto Alegre.",
        "Your clock is my clock. That makes talking about a project a lot easier.",
        "We are on the same hours, so a call or a coffee would need no planning at all.",
        "Same hours, same weather complaints. Even more so if you are in Porto Alegre.",
        "One clock is enough for the two of us today.",
        "Our time zones match, so whatever hour it is, we are living it together."
    ];

    function previousNote()
    {
        try
        {
            return sessionStorage.getItem(LAST_NOTE_KEY) || "";
        }
        catch (error)
        {
            return "";
        }
    }

    function rememberNote(text)
    {
        try
        {
            sessionStorage.setItem(LAST_NOTE_KEY, text);
        }
        catch (error)
        {
            // storage can be blocked (private mode)
        }
    }

    // never repeat the line the visitor saw on the previous load
    function pick(texts)
    {
        const last = previousNote();
        const options = texts.filter(text => text !== last);
        const pool = options.length ? options : texts;

        return pool[Math.floor(Math.random() * pool.length)];
    }

    function noteFor(home, visitor)
    {
        const hours = gap(home, visitor);
        const homeMoment = moment(home);
        const visitorMoment = moment(visitor);
        const rule = rules.find(candidate => candidate.when(homeMoment, visitorMoment, hours));

        return pick(rule ? rule.texts : fallback);
    }

    function visitorZone()
    {
        try
        {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        }
        catch (error)
        {
            return "";
        }
    }

    function cityName(zone)
    {
        if (!zone.includes("/"))
        {
            return "Your time";
        }

        return zone.split("/").pop().replace(/_/g, " ");
    }

    const homeFormat = clockFormat(HOME_ZONE);
    const visitorFormat = clockFormat(null);

    function tick()
    {
        const stamp = new Date();

        homeTimeElement.textContent = homeFormat.format(stamp);
        visitorTimeElement.textContent = visitorFormat.format(stamp);

        return { home: read(HOME_ZONE), visitor: read(null) };
    }

    const zone = visitorZone();
    const sameZone = zone === HOME_ZONE;

    if (visitorLabelElement)
    {
        visitorLabelElement.textContent = cityName(zone);
    }

    const now = tick();
    const note = sameZone ? pick(sameZoneTexts) : noteFor(now.home, now.visitor);

    noteElement.textContent = note;
    rememberNote(note);
    clocks.classList.add("is-live");

    // a second clock showing the exact same hour would be pointless
    if (sameZone)
    {
        clocks.classList.add("is-local");
    }

    // line up with the start of the next minute, then keep a steady beat
    setTimeout(() =>
    {
        tick();
        setInterval(tick, 60000);
    }, (60 - new Date().getSeconds()) * 1000);
});
