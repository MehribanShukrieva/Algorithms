import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const getAbbreviation = (name) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
};

const getRadius = (percentage, minRadius = 8) => {
    if (percentage <= 50) {
        return minRadius + percentage * 1.5;
    } else {
        return minRadius + 50 * 1.5 + (percentage - 50);
    }
};

const BubbleChart = ({ data, onBubbleClick, isModalOpen }) => {
    const svgRef = useRef();
    const [dimensions, setDimensions] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 800,
        height: typeof window !== 'undefined' ? window.innerHeight * 1.2 : 600
    });
    const simulationRef = useRef();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => {
                setDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight * 1.2
                });
            };

            window.addEventListener('resize', handleResize);
            handleResize();
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    useEffect(() => {
        const { width, height } = dimensions;

        const svg = d3.select(svgRef.current)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('background-color', '#dbfeff');

        const defs = svg.append('defs');

        const filter = defs.append('filter')
            .attr('id', 'shadow')
            .attr('x', -1)
            .attr('y', -1)
            .attr('width', '300%')
            .attr('height', '300%');

        filter.append('feOffset')
            .attr('result', 'offOut')
            .attr('in', 'SourceGraphic')
            .attr('dx', 5)
            .attr('dy', 5);

        filter.append('feGaussianBlur')
            .attr('result', 'blurOut')
            .attr('in', 'offOut')
            .attr('stdDeviation', 10);

        filter.append('feBlend')
            .attr('in', 'SourceGraphic')
            .attr('in2', 'blurOut')
            .attr('mode', 'normal');

        const colorScale = d3.scaleOrdinal()
            .domain(['positive', 'negative'])
            .range(['#5EB1BF', '#FF6B6B']);

        data.forEach(d => {
            d.x = d.x || Math.random() * width;
            d.y = d.y || Math.random() * height;
            d.radius = getRadius(Math.abs(d.change), 8);
        });

        const drag = d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded);

        const simulation = d3.forceSimulation(data)
            .force('charge', d3.forceManyBody().strength(-10))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => d.radius + 5).strength(0.7))
            .alphaDecay(0.1)
            .on('tick', ticked);

        simulationRef.current = simulation;
        simulation.alpha(1).restart();

        const node = svg.selectAll('.node')
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .call(drag);

        node.append('circle')
            .attr('r', d => d.radius)
            .attr('fill', d => colorScale(d.change > 0 ? 'positive' : 'negative'))
            .attr('stroke', d => {
                const baseColor = colorScale(d.change > 0 ? 'positive' : 'negative');
                return d3.color(baseColor).darker(0.3);
            })
            .attr('stroke-width', 2)
            .attr('opacity', 0.7)
            .attr('filter', 'url(#shadow)')
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)
            .on('click', (event, d) => onBubbleClick(d))
            .style('cursor', 'pointer');

        node.append('text')
            .attr('dy', d => `${d.radius * 0.2}px`)
            .attr('text-anchor', 'middle')
            .style('fill', '#333')
            .style('font-size', d => d.radius * 0.4)
            .style('font-weight', 800)
            .style('font-family', 'Days Sans, Arial, sans-serif')
            .text(d => d.name.split(' ').length > 1 ? getAbbreviation(d.name) : d.name)
            .style('cursor', 'pointer');

        node.append('text')
            .attr('dy', d => `${d.radius * 0.2 + d.radius * 0.4 + Math.max(d.radius * 0.02, 6)}px`)
            .attr('text-anchor', 'middle')
            .style('fill', '#333')
            .style('font-size', d => d.radius * 0.3)
            .style('font-weight', 800)
            .style('font-family', 'Days Sans, Arial, sans-serif')
            .text(d => `${d.change}%`)
            .style('cursor', 'pointer');

        node.append('circle')
            .attr('r', d => d.radius * 0.3)
            .attr('fill', 'none')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('cy', d => -d.radius * 0.5)
            .style('cursor', 'pointer');

        function ticked() {
            node.attr('transform', d => {
                d.x = Math.max(d.radius, Math.min(width - d.radius, d.x));
                d.y = Math.max(d.radius, Math.min(height - d.radius, d.y));
                return `translate(${d.x},${d.y})`;
            });
        }

        function dragStarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragEnded(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function handleMouseOver(event, d) {
            d3.select(this).attr('stroke-width', 4);
        }

        function handleMouseOut(event, d) {
            d3.select(this).attr('stroke-width', 2);
        }

        return () => {
            // Clean up resources if necessary
            svg.selectAll('*').remove(); // Remove all SVG elements on cleanup
        };
    }, [data, onBubbleClick, dimensions]);

    return (
        <svg ref={svgRef}></svg>
    );
};

export default BubbleChart;
