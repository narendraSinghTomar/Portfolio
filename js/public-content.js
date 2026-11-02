
(async () => {
    if (
        !window.supabase ||
        !window.SUPABASE_URL ||
        !window.SUPABASE_ANON_KEY ||
        window.SUPABASE_URL.includes("YOUR-PROJECT")
    ) {
        console.error("Supabase configuration is missing.");
        return;
    }

    const db = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
    );

    const esc = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element && value) element.textContent = value;
    };

    // Fetch records and render only when the target exists
    async function query(id, promise, render) {
        const element = document.getElementById(id);
        if (!element) return;

        const { data, error } = await promise;

        if (error) {
            console.error(`Error loading ${id}:`, error);
            element.textContent = "Content could not be loaded.";
            return;
        }

        element.innerHTML = data?.length
            ? data.map(render).join("")
            : '<p class="muted">Nothing published here yet.</p>';

        return data;
    }

    // 1. PROFILE
    const { data: profiles, error: profileError } = await db
        .from("portfolio_profile")
        .select("*")
        .eq("status", "published")
        .limit(1);

    if (profileError) {
        console.error("Profile loading error:", profileError);
    }

    const profile = profiles?.[0];

    if (profile) {
        setText(
            "profileGreeting",
            `HELLO, I'M ${profile.name || "N.S. TOMAR"}`
        );

        setText("profileTitle", profile.professional_title);
        setText("profileIntro", profile.short_intro);
        setText("profileAbout", profile.about_text);
        setText("profileLearning", profile.current_focus);
        setText("profileLocation", profile.location);

        const image = document.getElementById("heroProfile");

        if (image && profile.profile_image_url) {
            image.src = profile.profile_image_url;
        }

        const highlights = document.getElementById("profileHighlights");

        if (highlights) {
            const items = [
                profile.current_focus,
                profile.career_objective
            ].filter(Boolean);

            if (items.length) {
                highlights.innerHTML = items
                    .map(item => `<li>${esc(item)}</li>`)
                    .join("");
            }
        }

        const links = document.getElementById("profileLinks");

        if (links) {
            const socialLinks = [
                { label: "GitHub", url: profile.github_url },
                { label: "LinkedIn", url: profile.linkedin_url }
            ].filter(item => item.url);

            links.innerHTML = socialLinks.length
                ? socialLinks.map(item =>
                    `<a href="${esc(item.url)}" target="_blank"
                    rel="noopener noreferrer">${esc(item.label)} ↗</a>`
                ).join("")
                : '<a href="contact.html">Contact ↗</a>';
        }
    }

    // 2. PROJECTS
    await query(
        "projectGrid",
        db.from("projects")
            .select("*")
            .eq("status", "published")
            .order("featured", { ascending: false })
            .order("created_at", { ascending: false }),

        p => `
            <article class="card project-card">
                ${p.thumbnail_url
                    ? `<img src="${esc(p.thumbnail_url)}" alt="${esc(p.title)}">`
                    : ""}
                <p>${esc(p.category)}</p>
                <h3>${esc(p.title)}</h3>
                <p>${esc(p.description)}</p>
                <div>
                    ${(p.technologies || []).map(t =>
                        `<span class="skill-tag">${esc(t)}</span>`
                    ).join(" ")}
                </div>
                ${p.github_url
                    ? `<a href="${esc(p.github_url)}" target="_blank" rel="noopener">GitHub ↗</a>`
                    : ""}
                ${p.live_demo_url
                    ? `<a href="${esc(p.live_demo_url)}" target="_blank" rel="noopener">Live demo ↗</a>`
                    : ""}
            </article>
        `
    );

    // 3. CERTIFICATES
    await query(
        "certificateGrid",
        db.from("certificates")
            .select("*")
            .eq("status", "published")
            .order("issue_date", { ascending: false }),

        c => `
            <article class="card">
                <h3>${esc(c.title)}</h3>
                <p>${esc(c.issuer)}</p>
                <p>${esc(c.description)}</p>
                ${c.file_url
                    ? `<a href="${esc(c.file_url)}" target="_blank" rel="noopener">View certificate ↗</a>`
                    : ""}
                ${c.credential_url
                    ? `<a href="${esc(c.credential_url)}" target="_blank" rel="noopener">Verify ↗</a>`
                    : ""}
            </article>
        `
    );

    // 4. SKILLS
    await query(
        "skillsGrid",
        db.from("skills")
            .select("*")
            .order("sort_order"),

        s => `
            <span class="skill-tag">
                ${esc(s.name)}
                ${s.category ? ` · ${esc(s.category)}` : ""}
                ${s.proficiency ? ` (${esc(s.proficiency)})` : ""}
            </span>
        `
    );

    // 5. RESUMES
    await query(
        "resumeGrid",
        db.from("resumes")
            .select("*")
            .order("is_primary", { ascending: false })
            .order("created_at", { ascending: false }),

        r => `
            <article class="card resume-card">
                <div>
                    <h3>${esc(r.title)}</h3>
                    <p>${esc(r.role)}</p>
                    <p>${esc(r.description)}</p>
                </div>
                <a class="btn" href="${esc(r.file_url)}"
                   target="_blank" rel="noopener" download>
                    Download PDF ↓
                </a>
            </article>
        `
    );

    // 6. EDUCATION
    await query(
        "educationGrid",
        db.from("portfolio_education")
            .select("*")
            .eq("status", "published")
            .order("start_date", { ascending: false }),

        e => `
            <article class="card">
                <p>
                    ${esc(e.start_date || "")} –
                    ${e.currently_studying
                        ? "Present"
                        : esc(e.end_date || "")}
                </p>
                <h3>${esc(e.degree)}</h3>
                <p>
                    ${esc(e.institution)}
                    ${e.university ? " · " + esc(e.university) : ""}
                    ${e.location ? " · " + esc(e.location) : ""}
                </p>
                ${e.grade ? `<p>${esc(e.grade)}</p>` : ""}
                <p>${esc(e.description)}</p>
            </article>
        `
    );

    // 7. EXPERIENCE
    await query(
        "experienceGrid",
        db.from("portfolio_experience")
            .select("*")
            .eq("status", "published")
            .order("start_date", { ascending: false }),

        e => `
            <article class="card">
                ${e.company_logo_url
                    ? `<img src="${esc(e.company_logo_url)}"
                        alt="${esc(e.company_name)} logo">`
                    : ""}
                <p>
                    ${esc(e.start_date || "")} –
                    ${e.currently_working
                        ? "Present"
                        : esc(e.end_date || "")}
                    · ${esc(e.employment_type)}
                </p>
                <h3>${esc(e.job_title)}</h3>
                <p>
                    ${esc(e.company_name)}
                    ${e.location ? " · " + esc(e.location) : ""}
                </p>
                <ul>
                    ${(e.responsibilities || []).map(item =>
                        `<li>${esc(item)}</li>`
                    ).join("")}
                </ul>
                <p>
                    ${(e.technologies || []).map(item =>
                        `<span class="skill-tag">${esc(item)}</span>`
                    ).join(" ")}
                </p>
                <p>${esc(e.description)}</p>
            </article>
        `
    );

    // 8. CONTACT DETAILS
    const { data: contacts, error: contactError } = await db
        .from("portfolio_contact")
        .select("*")
        .eq("status", "published")
        .limit(1);

    if (contactError) {
        console.error("Contact loading error:", contactError);
    }

    const contact = contacts?.[0];

    if (contact) {
        const email = document.getElementById("contactEmail");
        if (email && contact.email) {
            email.textContent = contact.email;
            email.href = `mailto:${contact.email}`;
        }

        const phone = document.getElementById("contactPhone");
        if (phone && contact.phone) {
            phone.textContent = contact.phone;
            phone.href = `tel:${contact.phone}`;
        }

        setText("contactLocation", contact.location);

        const socials = document.getElementById("contactSocials");

        if (socials) {
            const links = [
                { label: "LinkedIn", url: contact.linkedin_url },
                { label: "GitHub", url: contact.github_url },
                { label: "Website", url: contact.website_url }
            ].filter(item => item.url);

            socials.innerHTML = links.map(item =>
                `<a class="secondary-btn"
                    href="${esc(item.url)}"
                    target="_blank"
                    rel="noopener">${esc(item.label)} ↗</a>`
            ).join("");
        }
    }

    // 9. CONTACT FORM
    const form = document.getElementById("contactForm");

    if (form) {
        form.onsubmit = async (event) => {
            event.preventDefault();

            const status = document.getElementById("contactFormStatus");

            if (status) status.textContent = "Sending…";

            const formData = new FormData(form);

            const { error } = await db
                .from("contact_messages")
                .insert({
                    name: formData.get("name"),
                    email: formData.get("email"),
                    subject: formData.get("subject"),
                    message: formData.get("message")
                });

            if (status) {
                status.textContent = error
                    ? "Message could not be sent. Please try again later."
                    : "Thanks, your message has been sent.";
            }

            if (!error) form.reset();

            if (error) console.error("Contact form error:", error);
        };
    }

    console.log("Portfolio content loading completed.");
})();
