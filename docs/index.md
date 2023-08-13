Welcome to the Biomes Source Code!

Biomes is an open source massively-multiplayer, fully destructable game running in a web browser. It's written primarily Typescript and WebAssembly and uses React and reactive paradigms for gameplay. 

[![Biomes Screenshot](assets/images/biomes-ss.png) Watch the trailer!](https://www.youtube.com/watch?v=vPHEtewFm3M)

# Documentation
<ul>
{% assign sorted = site.pages | sort:"order" %}
{% for page in sorted %}
    {% if page.title and page.url != "/" %}
    <li><a href="{{ page.url | relative_url }}">
        {{ page.title }}</a>{% if page.description %}: {{ page.description }}{% endif %}
    </li>
    {% endif %}
{% endfor %}
</ul>
